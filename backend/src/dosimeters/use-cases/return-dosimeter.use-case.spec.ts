import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReturnDosimeterUseCase } from './return-dosimeter.use-case';

describe('ReturnDosimeterUseCase', () => {
  let supabase: { getClient: jest.Mock };
  let audit: { log: jest.Mock };
  let orgScope: { getOrganizationType: jest.Mock };
  let useCase: ReturnDosimeterUseCase;

  const dto = { returned_at: '2026-08-04', current_condition: 'danado', notes: undefined };

  beforeEach(() => {
    supabase = { getClient: jest.fn() };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    orgScope = { getOrganizationType: jest.fn().mockResolvedValue('laboratory') };
    useCase = new ReturnDosimeterUseCase(supabase as any, audit as any, orgScope as any);
  });

  it('rejects when the requesting organization is not the laboratory', async () => {
    orgScope.getOrganizationType.mockResolvedValue('client');
    await expect(useCase.execute('d-1', dto as any, 'org-1', 'user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('throws NotFoundException when there is no open assignment', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'dosimeter_assignments') {
          return {
            select: () => ({ eq: () => ({ is: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    await expect(useCase.execute('d-1', dto as any, 'org-1', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('closes the assignment, updates the dosimeter status and condition, and logs the audit entry', async () => {
    const dosimeterUpdate = jest.fn().mockReturnValue({ eq: () => Promise.resolve({ error: null }) });
    const assignmentUpdateSingle = jest.fn().mockResolvedValue({
      data: {
        id: 'assignment-1',
        dosimeter_id: 'd-1',
        worker_id: 'worker-1',
        assigned_at: '2026-07-01',
        returned_at: '2026-08-04',
        status: 'cerrado',
        notes: null,
      },
      error: null,
    });

    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'dosimeter_assignments') {
          return {
            select: () => ({
              eq: () => ({ is: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 'assignment-1', notes: null } }) }) }),
            }),
            update: () => ({ eq: () => ({ select: () => ({ single: assignmentUpdateSingle }) }) }),
          };
        }
        if (table === 'dosimeters') {
          return { update: dosimeterUpdate };
        }
        if (table === 'dosimeter_statuses') {
          return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: 'status-disponible' }, error: null }) }) }) };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    const result = await useCase.execute('d-1', dto as any, 'org-1', 'user-1');

    expect(result.id).toBe('assignment-1');
    expect(dosimeterUpdate).toHaveBeenCalledWith({
      status_id: 'status-disponible',
      current_condition: 'danado',
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'UPDATE', entityName: 'dosimeter_assignments' }),
    );
  });
});
