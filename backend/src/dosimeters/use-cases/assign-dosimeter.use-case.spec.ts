import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AssignDosimeterUseCase } from './assign-dosimeter.use-case';

describe('AssignDosimeterUseCase', () => {
  let supabase: { getClient: jest.Mock };
  let audit: { log: jest.Mock };
  let orgScope: { getOrganizationType: jest.Mock };
  let useCase: AssignDosimeterUseCase;

  const dto = { worker_id: 'worker-1', assigned_at: '2026-08-01', notes: undefined };

  beforeEach(() => {
    supabase = { getClient: jest.fn() };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    orgScope = { getOrganizationType: jest.fn().mockResolvedValue('laboratory') };
    useCase = new AssignDosimeterUseCase(supabase as any, audit as any, orgScope as any);
  });

  it('rejects when the requesting organization is not the laboratory', async () => {
    orgScope.getOrganizationType.mockResolvedValue('client');
    await expect(useCase.execute('d-1', dto as any, 'org-1', 'user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects when there is already an open assignment', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'dosimeters') {
          return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 'd-1' } }) }) }) };
        }
        if (table === 'workers') {
          return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 'worker-1' } }) }) }) };
        }
        if (table === 'dosimeter_assignments') {
          return {
            select: () => ({
              eq: () => ({ is: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 'existing-assignment' } }) }) }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    await expect(useCase.execute('d-1', dto as any, 'org-1', 'user-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('throws NotFoundException when the dosimeter does not exist', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'dosimeters') {
          return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    await expect(useCase.execute('d-1', dto as any, 'org-1', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('assigns the dosimeter, updates its status, and logs the audit entry', async () => {
    const dosimeterUpdate = jest.fn().mockReturnValue({ eq: () => Promise.resolve({ error: null }) });
    const assignmentInsertSingle = jest.fn().mockResolvedValue({
      data: { id: 'assignment-1', dosimeter_id: 'd-1', worker_id: 'worker-1', assigned_at: '2026-08-01', status: 'activo', notes: null },
      error: null,
    });

    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'dosimeters') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 'd-1' } }) }) }),
            update: dosimeterUpdate,
          };
        }
        if (table === 'workers') {
          return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 'worker-1' } }) }) }) };
        }
        if (table === 'dosimeter_assignments') {
          return {
            select: () => ({
              eq: () => ({ is: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
            }),
            insert: () => ({ select: () => ({ single: assignmentInsertSingle }) }),
          };
        }
        if (table === 'dosimeter_statuses') {
          return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: 'status-asignado' }, error: null }) }) }) };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    const result = await useCase.execute('d-1', dto as any, 'org-1', 'user-1');

    expect(result.id).toBe('assignment-1');
    expect(dosimeterUpdate).toHaveBeenCalledWith({ status_id: 'status-asignado' });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', entityName: 'dosimeter_assignments' }),
    );
  });
});
