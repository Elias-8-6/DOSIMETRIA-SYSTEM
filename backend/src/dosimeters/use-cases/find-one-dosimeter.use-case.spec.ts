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

    await expect(useCase.execute('d-1', 'org-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when a client org was never linked to the dosimeter', async () => {
    orgScope.getOrganizationType.mockResolvedValue('client');
    orgScope.isDosimeterAllowedForClientOrg.mockResolvedValue(false);
    supabase = buildSupabase(dosimeterRow, { data: [assignmentOrgB], error: null });
    useCase = new FindOneDosimeterUseCase(supabase as any, orgScope as any);

    await expect(useCase.execute('d-1', 'org-a')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns the open assignment unfiltered for a laboratory org', async () => {
    supabase = buildSupabase(dosimeterRow, { data: [assignmentOrgB], error: null });
    useCase = new FindOneDosimeterUseCase(supabase as any, orgScope as any);

    const result = await useCase.execute('d-1', 'lab-org');

    expect(result.dosimeter_assignments).toEqual([assignmentOrgB]);
  });

  it('regression: hides another organization\'s current assignment for a client org', async () => {
    orgScope.getOrganizationType.mockResolvedValue('client');
    orgScope.isDosimeterAllowedForClientOrg.mockResolvedValue(true);
    // Org A once had this dosimeter (allowed=true), but it is currently
    // assigned to org B -- the org-scoped query returns no rows for org A.
    const eqFilterMock = jest.fn().mockReturnValue({ data: [], error: null });
    supabase = buildSupabase(dosimeterRow, { data: [assignmentOrgB], error: null }, eqFilterMock);
    useCase = new FindOneDosimeterUseCase(supabase as any, orgScope as any);

    const result = await useCase.execute('d-1', 'client-a-org');

    expect(eqFilterMock).toHaveBeenCalledWith('workers.clients.organization_id', 'client-a-org');
    expect(result.dosimeter_assignments).toEqual([]);
    expect(result.id).toBe('d-1');
  });

  it('returns the current assignment when it belongs to the requesting client org', async () => {
    orgScope.getOrganizationType.mockResolvedValue('client');
    orgScope.isDosimeterAllowedForClientOrg.mockResolvedValue(true);
    const assignmentOrgA = { ...assignmentOrgB, id: 'assignment-a', workers: { ...assignmentOrgB.workers, id: 'worker-a' } };
    const eqFilterMock = jest.fn().mockReturnValue({ data: [assignmentOrgA], error: null });
    supabase = buildSupabase(dosimeterRow, { data: [assignmentOrgA], error: null }, eqFilterMock);
    useCase = new FindOneDosimeterUseCase(supabase as any, orgScope as any);

    const result = await useCase.execute('d-1', 'client-a-org');

    expect(result.dosimeter_assignments).toEqual([assignmentOrgA]);
  });
});
