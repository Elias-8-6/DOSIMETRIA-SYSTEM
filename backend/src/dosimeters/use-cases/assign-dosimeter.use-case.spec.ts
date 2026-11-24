import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
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
          return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 'd-1', serial_number: 'SN-001' } }) }) }) };
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

  it('rejects with BadRequestException when dosimeter has no assembled holder and none was provided', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'dosimeters') {
          return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 'd-1', serial_number: 'SN-001' } }) }) }) };
        }
        if (table === 'workers') {
          return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 'worker-1' } }) }) }) };
        }
        if (table === 'dosimeter_assignments') {
          return {
            select: () => ({
              eq: () => ({ is: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
            }),
          };
        }
        if (table === 'holder_tld_assemblies') {
          return {
            select: () => ({
              eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
            }),
          };
        }
        if (table === 'holder_dosimeters') {
          return {
            select: () => ({
              eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    await expect(useCase.execute('d-1', dto as any, 'org-1', 'user-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('assigns the dosimeter when an active holder is assembled, updating holder status to en_campo', async () => {
    const dosimeterUpdate = jest.fn().mockReturnValue({ eq: () => Promise.resolve({ error: null }) });
    const holderUpdate = jest.fn().mockReturnValue({ eq: () => Promise.resolve({ error: null }) });
    const assignmentInsertSingle = jest.fn().mockResolvedValue({
      data: {
        id: 'assignment-1',
        dosimeter_id: 'd-1',
        holder_id: 'holder-1',
        worker_id: 'worker-1',
        assigned_at: '2026-08-01',
        status: 'activo',
        notes: null,
      },
      error: null,
    });

    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'dosimeters') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 'd-1', serial_number: 'SN-001' } }) }) }),
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
        if (table === 'holder_tld_assemblies') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: { id: 'assembly-1', holder_id: 'holder-1', is_active: true } }),
                }),
              }),
            }),
          };
        }
        if (table === 'holder_dosimeters') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({
                  data: { id: 'holder-1', barcode: 'BAR-001', serial_number: 'HOLD-001', status: 'ensamblado', current_condition: 'integro' },
                }),
              }),
            }),
            update: holderUpdate,
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
    expect(result.holder_id).toBe('holder-1');
    expect(result.holder.barcode).toBe('BAR-001');
    expect(dosimeterUpdate).toHaveBeenCalledWith({ status_id: 'status-asignado' });
    expect(holderUpdate).toHaveBeenCalledWith({ status: 'en_campo' });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', entityName: 'dosimeter_assignments' }),
    );
  });

  it('performs on-the-fly assembly and assigns when holder_barcode is provided', async () => {
    const dosimeterUpdate = jest.fn().mockReturnValue({ eq: () => Promise.resolve({ error: null }) });
    const holderUpdate = jest.fn().mockReturnValue({ eq: () => Promise.resolve({ error: null }) });
    const assemblyInsert = jest.fn().mockReturnValue({
      select: () => ({ single: () => Promise.resolve({ data: { id: 'new-assembly-1' }, error: null }) }),
    });
    const assignmentInsertSingle = jest.fn().mockResolvedValue({
      data: {
        id: 'assignment-express',
        dosimeter_id: 'd-1',
        holder_id: 'holder-scanned',
        worker_id: 'worker-1',
        assigned_at: '2026-08-01',
        status: 'activo',
        notes: null,
      },
      error: null,
    });

    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'dosimeters') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 'd-1', serial_number: 'SN-001' } }) }) }),
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
        if (table === 'holder_tld_assemblies') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: null }),
                }),
              }),
            }),
            insert: assemblyInsert,
          };
        }
        if (table === 'holder_dosimeters') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({
                  data: { id: 'holder-scanned', barcode: 'BAR-SCAN-999', serial_number: 'BAR-SCAN-999', status: 'disponible', current_condition: 'integro' },
                }),
              }),
            }),
            update: holderUpdate,
          };
        }
        if (table === 'dosimeter_statuses') {
          return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: 'status-asignado' }, error: null }) }) }) };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    const result = await useCase.execute(
      'd-1',
      { ...dto, holder_barcode: 'BAR-SCAN-999' } as any,
      'org-1',
      'user-1',
    );

    expect(result.id).toBe('assignment-express');
    expect(result.holder.barcode).toBe('BAR-SCAN-999');
    expect(assemblyInsert).toHaveBeenCalled();
    expect(holderUpdate).toHaveBeenCalledWith({ status: 'en_campo' });
  });

  it('rejects when the assembled holder is in baja status', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'dosimeters') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: { id: 'd-1', serial_number: 'SN-001', model: 'TLD' },
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (table === 'workers') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: { id: 'w-1', full_name: 'Juan Perez', medical_status: 'apto' },
                    error: null,
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
                  maybeSingle: () => Promise.resolve({ data: null, error: null }),
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
                  maybeSingle: () =>
                    Promise.resolve({
                      data: { id: 'asm-1', holder_id: 'holder-baja', is_active: true },
                      error: null,
                    }),
                }),
              }),
            }),
          };
        }
        if (table === 'holder_dosimeters') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: 'holder-baja',
                      barcode: 'HLD-BAJA',
                      serial_number: 'HLD-BAJA',
                      status: 'baja',
                      current_condition: 'integro',
                    },
                    error: null,
                  }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    await expect(
      useCase.execute('d-1', dto as any, 'org-1', 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects express assembly when dosimeter is already assembled to a different holder', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'dosimeters') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: { id: 'd-1', serial_number: 'SN-001', model: 'TLD' },
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (table === 'workers') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: { id: 'w-1', full_name: 'Juan Perez', medical_status: 'apto' },
                    error: null,
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
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: 'scanned-h-2',
                      barcode: 'HLD-NEW',
                      serial_number: 'HLD-NEW',
                      status: 'disponible',
                      current_condition: 'integro',
                    },
                    error: null,
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
                  maybeSingle: () =>
                    Promise.resolve({
                      data: { id: 'asm-diff', holder_id: 'other-holder-id' },
                      error: null,
                    }),
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    await expect(
      useCase.execute('d-1', { ...dto, holder_barcode: 'HLD-NEW' } as any, 'org-1', 'user-1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
