import { NotFoundException } from '@nestjs/common';
import { FindOneDosimeterUseCase } from './find-one-dosimeter.use-case';

describe('FindOneDosimeterUseCase', () => {
  let supabase: { getClient: jest.Mock };
  let orgScope: { getOrganizationType: jest.Mock; isDosimeterAllowedForClientOrg: jest.Mock };
  let useCase: FindOneDosimeterUseCase;

  const dosimeterRow = { id: 'd-1', serial_number: 'SN-0001' };

  const assignmentOrgB = {
    id: 'assignment-b',
    assigned_at: '2026-02-01',
    returned_at: null,
    status: 'activo',
    notes: 'nota confidencial de org B',
    workers: {
      id: 'worker-b',
      full_name: 'Trabajador B',
      document_number: 'DOC-B',
      clients: { id: 'client-b', name: 'Cliente B', code: 'B' },
    },
  };

  const buildSupabase = (
    dosimeter: unknown,
    assignmentResult: { data: unknown[]; error: null },
    eqFilterMock?: jest.Mock,
  ) => ({
    getClient: jest.fn().mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'dosimeters') {
          return {
            select: () => ({
              eq: () => ({ maybeSingle: () => Promise.resolve({ data: dosimeter, error: null }) }),
            }),
          };
        }
        if (table === 'dosimeter_assignments') {
          return {
            select: () => ({
              eq: () => ({
                is: () => ({
                  data: assignmentResult.data,
                  error: assignmentResult.error,
                  eq: eqFilterMock ?? jest.fn(),
                }),
              }),
            }),
          };
        }
        if (table === 'holder_tld_assemblies') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: null, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'holder_dosimeters') {
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
    }),
  });

  beforeEach(() => {
    orgScope = {
      getOrganizationType: jest.fn().mockResolvedValue('laboratory'),
      isDosimeterAllowedForClientOrg: jest.fn().mockResolvedValue(true),
    };
  });

  it('throws NotFoundException when the dosimeter does not exist', async () => {
    supabase = buildSupabase(null, { data: [], error: null });
    useCase = new FindOneDosimeterUseCase(supabase as any, orgScope as any);

    await expect(useCase.execute('d-missing', 'org-lab')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws NotFoundException when a client org has never been assigned the dosimeter', async () => {
    orgScope.getOrganizationType.mockResolvedValue('client');
    orgScope.isDosimeterAllowedForClientOrg.mockResolvedValue(false);

    supabase = buildSupabase(dosimeterRow, { data: [], error: null });
    useCase = new FindOneDosimeterUseCase(supabase as any, orgScope as any);

    await expect(useCase.execute('d-1', 'org-client-intruder')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns the open assignment unfiltered for a laboratory org', async () => {
    supabase = buildSupabase(dosimeterRow, { data: [assignmentOrgB], error: null });
    useCase = new FindOneDosimeterUseCase(supabase as any, orgScope as any);

    const result = await useCase.execute('d-1', 'org-lab');

    expect(result.dosimeter_assignments).toEqual([assignmentOrgB]);
  });

  it('regression: hides another organization current assignment for a client org', async () => {
    orgScope.getOrganizationType.mockResolvedValue('client');

    const eqFilterMock = jest.fn().mockReturnValue({ data: [], error: null });

    supabase = buildSupabase(dosimeterRow, { data: [assignmentOrgB], error: null }, eqFilterMock);
    useCase = new FindOneDosimeterUseCase(supabase as any, orgScope as any);

    const result = await useCase.execute('d-1', 'org-client-a');

    expect(result.dosimeter_assignments).toEqual([]);
  });

  it('returns the current assignment when it belongs to the requesting client org', async () => {
    orgScope.getOrganizationType.mockResolvedValue('client');

    const assignmentOrgA = { ...assignmentOrgB, id: 'assignment-a' };
    const eqFilterMock = jest.fn().mockReturnValue({ data: [assignmentOrgA], error: null });

    supabase = buildSupabase(dosimeterRow, { data: [assignmentOrgA], error: null }, eqFilterMock);
    useCase = new FindOneDosimeterUseCase(supabase as any, orgScope as any);

    const result = await useCase.execute('d-1', 'org-client-a');

    expect(result.dosimeter_assignments).toEqual([assignmentOrgA]);
  });

  it('debe activar fallback y mapear barcode = serial_number si falta la columna barcode en BD', async () => {
    let callCount = 0;
    const client = {
      from: jest.fn((table: string) => {
        if (table === 'dosimeters') {
          callCount++;
          if (callCount === 1) {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: () =>
                    Promise.resolve({
                      data: null,
                      error: { code: '42703', message: 'column dosimeters.barcode does not exist' },
                    }),
                }),
              }),
            };
          }
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { id: 'd-1', serial_number: 'SN-FALLBACK' }, error: null }),
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
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        };
      }),
    };

    useCase = new FindOneDosimeterUseCase({ getClient: () => client } as any, orgScope as any);
    const result = await useCase.execute('d-1', 'org-lab');

    expect(result.barcode).toBe('SN-FALLBACK');
  });

  it('lanza NotFoundException cuando la columna barcode falta y el dosímetro no existe', async () => {
    let callCount = 0;
    const client = {
      from: jest.fn((table: string) => {
        if (table === 'dosimeters') {
          callCount++;
          if (callCount === 1) {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: () =>
                    Promise.resolve({
                      data: null,
                      error: { code: '42703', message: 'column dosimeters.barcode does not exist' },
                    }),
                }),
              }),
            };
          }
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        };
      }),
    };

    useCase = new FindOneDosimeterUseCase({ getClient: () => client } as any, orgScope as any);
    await expect(useCase.execute('non-existent', 'org-lab')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lanza Error cuando la columna barcode falta y el query de fallback falla', async () => {
    let callCount = 0;
    const client = {
      from: jest.fn((table: string) => {
        if (table === 'dosimeters') {
          callCount++;
          if (callCount === 1) {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: () =>
                    Promise.resolve({
                      data: null,
                      error: { code: '42703', message: 'column dosimeters.barcode does not exist' },
                    }),
                }),
              }),
            };
          }
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: null,
                    error: { code: '08006', message: 'connection failure' },
                  }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        };
      }),
    };

    useCase = new FindOneDosimeterUseCase({ getClient: () => client } as any, orgScope as any);
    await expect(useCase.execute('d-1', 'org-lab')).rejects.toThrow('Error al obtener el dosímetro');
  });
});
