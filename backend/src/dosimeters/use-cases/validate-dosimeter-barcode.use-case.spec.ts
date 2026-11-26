import { ForbiddenException } from '@nestjs/common';
import { ValidateDosimeterBarcodeUseCase } from './validate-dosimeter-barcode.use-case';

describe('ValidateDosimeterBarcodeUseCase', () => {
  let supabase: { getClient: jest.Mock };
  let orgScope: { getOrganizationType: jest.Mock };
  let useCase: ValidateDosimeterBarcodeUseCase;

  beforeEach(() => {
    supabase = { getClient: jest.fn() };
    orgScope = { getOrganizationType: jest.fn().mockResolvedValue('laboratory') };
    useCase = new ValidateDosimeterBarcodeUseCase(supabase as any, orgScope as any);
  });

  it('rejects with ForbiddenException if organization is not laboratory', async () => {
    orgScope.getOrganizationType.mockResolvedValue('client');
    await expect(useCase.execute('DOS-100', 'org-client')).rejects.toThrow(ForbiddenException);
  });

  it('returns exists: false when barcode is not provided or empty', async () => {
    const result = await useCase.execute('   ', 'org-lab');
    expect(result.exists).toBe(false);
    expect(result.dosimeter).toBeNull();
    expect(result.message).toContain('no proporcionado');
  });

  it('returns exists: false when barcode is available for registration', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'dosimeters') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    const result = await useCase.execute('DOS-NEW-001', 'org-lab');
    expect(result.exists).toBe(false);
    expect(result.dosimeter).toBeNull();
    expect(result.message).toContain('está disponible');
  });

  it('returns exists: true with full dosimeter info and active holder/assignment', async () => {
    const existingDosimeter = {
      id: 'd-1',
      serial_number: 'SN-100',
      barcode: 'DOS-SCAN-100',
      internal_code: 'INT-100',
      lot_number: 'LOT-A',
      model: 'Harshaw 8807',
      manufacturer: 'Thermo Fisher',
      current_condition: 'normal',
      reusable: true,
      dosimeter_statuses: { code: 'ASIGNADO', name: 'Asignado' },
      dosimeter_types: { name: 'TLD Personal' },
    };

    const assemblyData = {
      id: 'asm-1',
      assembled_at: '2026-11-20T10:00:00Z',
      holder_dosimeters: {
        id: 'h-1',
        barcode: 'HLD-001',
        serial_number: 'HLD-001',
        holder_color: 'azul',
        clip_type: 'pinza_cocodrilo',
        model: 'Universal',
        current_condition: 'integro',
        status: 'en_campo',
      },
    };

    const assignmentData = {
      id: 'asg-1',
      assigned_at: '2026-11-21T09:00:00Z',
      workers: {
        full_name: 'Juan Perez',
        clients: { name: 'Clinica Radiológica' },
      },
    };

    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'dosimeters') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: existingDosimeter, error: null }),
              }),
            }),
          };
        }
        if (table === 'holder_tld_assemblies') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: assemblyData, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'dosimeter_assignments') {
          return {
            select: () => ({
              eq: () => ({
                is: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: () => Promise.resolve({ data: assignmentData, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    const result = await useCase.execute('DOS-SCAN-100', 'org-lab');
    expect(result.exists).toBe(true);
    expect(result.dosimeter).toBeDefined();
    expect(result.dosimeter?.serial_number).toBe('SN-100');
    expect(result.dosimeter?.barcode).toBe('DOS-SCAN-100');
    expect(result.dosimeter?.active_holder?.barcode).toBe('HLD-001');
    expect(result.dosimeter?.active_holder?.status).toBe('en_campo');
    expect(result.dosimeter?.active_assignment?.worker_name).toBe('Juan Perez');
  });

  it('activa fallback por serial_number cuando la columna barcode no existe en BD (42703)', async () => {
    let callCount = 0;
    const legacyDosimeter = {
      id: 'd-1',
      serial_number: 'SN-FALLBACK-VAL',
      internal_code: 'INT-VAL',
      current_condition: 'normal',
      reusable: true,
      dosimeter_statuses: { code: 'DISPONIBLE', name: 'Disponible' },
      dosimeter_types: { name: 'TLD' },
    };

    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'dosimeters') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => {
                  callCount++;
                  if (callCount === 1) {
                    return Promise.resolve({
                      data: null,
                      error: { code: '42703', message: 'column barcode does not exist' },
                    });
                  }
                  return Promise.resolve({ data: legacyDosimeter, error: null });
                },
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
              is: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: () => Promise.resolve({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          }),
        };
      }),
    });

    const result = await useCase.execute('SN-FALLBACK-VAL', 'org-lab');
    expect(result.exists).toBe(true);
    expect(result.dosimeter?.serial_number).toBe('SN-FALLBACK-VAL');
    expect(result.dosimeter?.barcode).toBe('SN-FALLBACK-VAL');
    expect(callCount).toBe(2);
  });

  it('lanza Error cuando la búsqueda de fallback falla en BD y no informa disponibilidad falsa', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'dosimeters') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: null,
                    error: { code: '08006', message: 'database connection error' },
                  }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    await expect(useCase.execute('DOS-ERR', 'org-lab')).rejects.toThrow(
      'Error en base de datos al validar código de barras',
    );
  });
});
