import { NotFoundException } from '@nestjs/common';
import { GetDosimeterHistoryUseCase } from './get-dosimeter-history.use-case';

describe('GetDosimeterHistoryUseCase', () => {
  let supabase: { getClient: jest.Mock };
  let orgScope: { getOrganizationType: jest.Mock; isDosimeterAllowedForClientOrg: jest.Mock };
  let useCase: GetDosimeterHistoryUseCase;

  const rowOrgA = {
    id: 'assignment-a',
    assigned_at: '2026-01-01',
    returned_at: '2026-01-31',
    status: 'cerrado',
    notes: 'nota confidencial de org A',
    assigned_by: null,
    workers: {
      id: 'worker-a',
      full_name: 'Trabajador A',
      document_number: 'DOC-A',
      clients: { id: 'client-a', name: 'Cliente A', code: 'A' },
    },
  };
  const rowOrgB = {
    id: 'assignment-b',
    assigned_at: '2026-02-01',
    returned_at: null,
    status: 'activo',
    notes: 'nota confidencial de org B',
    assigned_by: null,
    workers: {
      id: 'worker-b',
      full_name: 'Trabajador B',
      document_number: 'DOC-B',
      clients: { id: 'client-b', name: 'Cliente B', code: 'B' },
    },
  };

  const buildSupabase = (
    assignmentsResult: { data: unknown[]; error: null },
    eqFilterMock?: jest.Mock,
  ) => ({
    getClient: jest.fn().mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'dosimeters') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 'd-1' } }) }) }),
          };
        }
        if (table === 'dosimeter_assignments') {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  data: assignmentsResult.data,
                  error: assignmentsResult.error,
                  eq: eqFilterMock ?? jest.fn(),
                }),
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
    supabase = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn(() => ({
          select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
        })),
      }),
    };
    useCase = new GetDosimeterHistoryUseCase(supabase as any, orgScope as any);

    await expect(useCase.execute('d-1', 'org-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when a client org was never linked to the dosimeter', async () => {
    orgScope.getOrganizationType.mockResolvedValue('client');
    orgScope.isDosimeterAllowedForClientOrg.mockResolvedValue(false);
    supabase = buildSupabase({ data: [rowOrgA, rowOrgB], error: null });
    useCase = new GetDosimeterHistoryUseCase(supabase as any, orgScope as any);

    await expect(useCase.execute('d-1', 'org-a')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns the full unfiltered history for a laboratory org', async () => {
    supabase = buildSupabase({ data: [rowOrgA, rowOrgB], error: null });
    useCase = new GetDosimeterHistoryUseCase(supabase as any, orgScope as any);

    const result = await useCase.execute('d-1', 'lab-org');

    expect(result.items).toEqual([rowOrgA, rowOrgB]);
  });

  it('regression: filters out other organizations assignment rows for a client org', async () => {
    orgScope.getOrganizationType.mockResolvedValue('client');
    orgScope.isDosimeterAllowedForClientOrg.mockResolvedValue(true);
    const eqFilterMock = jest.fn().mockReturnValue({ data: [rowOrgA], error: null });
    supabase = buildSupabase({ data: [rowOrgA, rowOrgB], error: null }, eqFilterMock);
    useCase = new GetDosimeterHistoryUseCase(supabase as any, orgScope as any);

    const result = await useCase.execute('d-1', 'client-a-org');

    expect(eqFilterMock).toHaveBeenCalledWith('workers.clients.organization_id', 'client-a-org');
    expect(result.items).toEqual([rowOrgA]);
    expect(result.items).not.toContainEqual(rowOrgB);
  });
});
