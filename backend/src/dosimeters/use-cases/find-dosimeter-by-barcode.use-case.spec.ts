import { NotFoundException } from '@nestjs/common';
import { FindDosimeterByBarcodeUseCase } from './find-dosimeter-by-barcode.use-case';

describe('FindDosimeterByBarcodeUseCase', () => {
  let supabase: { getClient: jest.Mock };
  let orgScope: { getOrganizationType: jest.Mock; isDosimeterAllowedForClientOrg: jest.Mock };
  let useCase: FindDosimeterByBarcodeUseCase;

  beforeEach(() => {
    supabase = { getClient: jest.fn() };
    orgScope = {
      getOrganizationType: jest.fn().mockResolvedValue('laboratory'),
      isDosimeterAllowedForClientOrg: jest.fn().mockResolvedValue(true),
    };
    useCase = new FindDosimeterByBarcodeUseCase(supabase as any, orgScope as any);
  });

  it('throws NotFoundException when barcode is empty', async () => {
    await expect(useCase.execute('   ', 'org-lab')).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when dosimeter is not found in database', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      })),
    });

    await expect(useCase.execute('DOS-UNKNOWN', 'org-lab')).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when client organization is not allowed access', async () => {
    orgScope.getOrganizationType.mockResolvedValue('client');
    orgScope.isDosimeterAllowedForClientOrg.mockResolvedValue(false);

    supabase.getClient.mockReturnValue({
      from: jest.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: { id: 'd-other', barcode: 'DOS-OTHER' }, error: null }),
          }),
        }),
      })),
    });

    await expect(useCase.execute('DOS-OTHER', 'org-client-1')).rejects.toThrow(NotFoundException);
  });

  it('returns dosimeter with active holder when found', async () => {
    const dosimeterData = {
      id: 'd-10',
      serial_number: 'TF-001',
      barcode: 'DOS-202611-1001',
      internal_code: 'INT-10',
      current_condition: 'normal',
      reusable: true,
      created_at: '2026-11-20T10:00:00Z',
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
        status: 'ensamblado',
        current_condition: 'integro',
      },
    };

    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'dosimeters') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: dosimeterData, error: null }),
              }),
            }),
          };
        }
        if (table === 'dosimeter_assignments') {
          return {
            select: () => ({
              eq: () => ({
                is: () => Promise.resolve({ data: [], error: null }),
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
        throw new Error(`unexpected table ${table}`);
      }),
    });

    const result = await useCase.execute('DOS-202611-1001', 'org-lab');
    expect(result.id).toBe('d-10');
    expect(result.barcode).toBe('DOS-202611-1001');
    expect(result.active_holder?.barcode).toBe('HLD-001');
  });

  it('activa fallback por serial_number cuando la columna barcode no existe en BD (42703)', async () => {
    let dosimetersSelectCount = 0;
    const legacyDosimeter = {
      id: 'd-legacy',
      serial_number: 'SN-LEGACY-01',
      internal_code: null,
      current_condition: 'normal',
      reusable: true,
      created_at: '2026-11-20T10:00:00Z',
    };

    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'dosimeters') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => {
                  dosimetersSelectCount++;
                  if (dosimetersSelectCount === 1) {
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
        if (table === 'dosimeter_assignments') {
          return {
            select: () => ({
              eq: () => ({
                is: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === 'holder_tld_assemblies' || table === 'holder_dosimeters') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: null, error: null }),
                }),
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    const result = await useCase.execute('SN-LEGACY-01', 'org-lab');
    expect(result.id).toBe('d-legacy');
    expect(result.barcode).toBe('SN-LEGACY-01');
    expect(dosimetersSelectCount).toBe(2);
  });

  it('lanza Error cuando la búsqueda de fallback por serial_number falla en BD', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'dosimeters') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: null,
                    error: { code: '08006', message: 'connection dropped' },
                  }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    await expect(useCase.execute('SN-ERR', 'org-lab')).rejects.toThrow(
      'Error al obtener el dosímetro por código de barras',
    );
  });
});
