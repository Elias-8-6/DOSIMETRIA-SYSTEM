import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UpdateDosimeterStatusUseCase } from './update-dosimeter-status.use-case';

describe('UpdateDosimeterStatusUseCase', () => {
  let supabase: { getClient: jest.Mock };
  let audit: { log: jest.Mock };
  let orgScope: { getOrganizationType: jest.Mock };
  let useCase: UpdateDosimeterStatusUseCase;

  beforeEach(() => {
    supabase = { getClient: jest.fn() };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    orgScope = { getOrganizationType: jest.fn().mockResolvedValue('laboratory') };
    useCase = new UpdateDosimeterStatusUseCase(supabase as any, audit as any, orgScope as any);
  });

  it('rejects when the requesting organization is not the laboratory', async () => {
    orgScope.getOrganizationType.mockResolvedValue('client');
    await expect(
      useCase.execute('d-1', { status: 'DISPONIBLE' }, 'org-client', 'user-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects setting status directly to ASIGNADO or EN_TRANSITO', async () => {
    await expect(
      useCase.execute('d-1', { status: 'ASIGNADO' }, 'org-lab', 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      useCase.execute('d-1', { status: 'EN_TRANSITO' }, 'org-lab', 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException when dosimeter does not exist', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'dosimeters') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    await expect(
      useCase.execute('d-non-existent', { status: 'DISPONIBLE' }, 'org-lab', 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects changing to DISPONIBLE when there is an open assignment', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'dosimeters') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: { id: 'd-1', dosimeter_statuses: { code: 'ASIGNADO' } },
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
                  maybeSingle: () =>
                    Promise.resolve({
                      data: { id: 'assignment-1', notes: 'Período activo' },
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
      useCase.execute('d-1', { status: 'DISPONIBLE' }, 'org-lab', 'user-1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('automatically closes open assignment when transitioning to BAJA or INCIDENTE', async () => {
    const assignmentUpdate = jest.fn().mockReturnValue({
      eq: () => Promise.resolve({ error: null }),
    });

    const dosimeterUpdate = jest.fn().mockReturnValue({
      eq: () => ({
        select: () => ({
          single: () =>
            Promise.resolve({
              data: {
                id: 'd-1',
                serial_number: 'TF-001',
                dosimeter_statuses: { code: 'BAJA', name: 'Dado de baja' },
              },
              error: null,
            }),
        }),
      }),
    });

    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'dosimeters') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: { id: 'd-1', dosimeter_statuses: { code: 'ASIGNADO' } },
                  }),
              }),
            }),
            update: dosimeterUpdate,
          };
        }
        if (table === 'dosimeter_assignments') {
          return {
            select: () => ({
              eq: () => ({
                is: () => ({
                  maybeSingle: () =>
                    Promise.resolve({
                      data: { id: 'assignment-1', notes: 'Nota previa' },
                    }),
                }),
              }),
            }),
            update: assignmentUpdate,
          };
        }
        if (table === 'dosimeter_statuses') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: { id: 'status-baja-id' }, error: null }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    const result = await useCase.execute('d-1', { status: 'BAJA' }, 'org-lab', 'user-1');

    expect(assignmentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'cerrado',
        notes: expect.stringContaining('Cierre automático por cambio de estado del dosímetro a BAJA'),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityName: 'dosimeter_assignments',
        action: 'UPDATE',
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityName: 'dosimeters',
        action: 'STATUS_CHANGE',
        newValues: { status: 'BAJA' },
      }),
    );
    expect((result as any).dosimeter_statuses.code).toBe('BAJA');
  });

  it('updates status normally when dosimeter has no open assignment', async () => {
    const dosimeterUpdate = jest.fn().mockReturnValue({
      eq: () => ({
        select: () => ({
          single: () =>
            Promise.resolve({
              data: {
                id: 'd-1',
                serial_number: 'TF-001',
                dosimeter_statuses: { code: 'EN_LAB', name: 'En laboratorio' },
              },
              error: null,
            }),
        }),
      }),
    });

    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'dosimeters') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: { id: 'd-1', dosimeter_statuses: { code: 'DISPONIBLE' } },
                  }),
              }),
            }),
            update: dosimeterUpdate,
          };
        }
        if (table === 'dosimeter_assignments') {
          return {
            select: () => ({
              eq: () => ({
                is: () => ({
                  maybeSingle: () => Promise.resolve({ data: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'dosimeter_statuses') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: { id: 'status-en-lab-id' }, error: null }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    const result = await useCase.execute('d-1', { status: 'EN_LAB' }, 'org-lab', 'user-1');

    expect((result as any).dosimeter_statuses.code).toBe('EN_LAB');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityName: 'dosimeters',
        action: 'STATUS_CHANGE',
        newValues: { status: 'EN_LAB' },
      }),
    );
  });
});
