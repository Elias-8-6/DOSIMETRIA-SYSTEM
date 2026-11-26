import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UpdateDosimeterUseCase } from './update-dosimeter.use-case';

describe('UpdateDosimeterUseCase', () => {
  let supabase: { getClient: jest.Mock };
  let audit: { log: jest.Mock };
  let orgScope: { getOrganizationType: jest.Mock };
  let useCase: UpdateDosimeterUseCase;

  beforeEach(() => {
    supabase = { getClient: jest.fn() };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    orgScope = { getOrganizationType: jest.fn().mockResolvedValue('laboratory') };
    useCase = new UpdateDosimeterUseCase(supabase as any, audit as any, orgScope as any);
  });

  it('rejects if organization is not laboratory', async () => {
    orgScope.getOrganizationType.mockResolvedValue('client');
    await expect(
      useCase.execute('d-1', { notes: 'New notes' }, 'org-client', 'user-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects if dosimeter is not found', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      })),
    });

    await expect(
      useCase.execute('d-nonexistent', { notes: 'New' }, 'org-lab', 'user-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects if barcode collides with another dosimeter', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: { id: 'd-1', serial_number: 'SN-1', barcode: 'DOS-OLD', internal_code: null },
                error: null,
              }),
            neq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: { id: 'd-2' }, error: null }),
            }),
          }),
        }),
      })),
    });

    await expect(
      useCase.execute('d-1', { barcode: 'DOS-TAKEN' }, 'org-lab', 'user-1'),
    ).rejects.toThrow(ConflictException);
  });

  it('updates barcode and logs audit correctly', async () => {
    const existing = {
      id: 'd-1',
      serial_number: 'SN-1',
      barcode: 'DOS-OLD',
      internal_code: 'INT-1',
    };

    const updated = {
      ...existing,
      barcode: 'DOS-NEW-999',
      notes: 'Updated barcode sticker',
    };

    supabase.getClient.mockReturnValue({
      from: jest.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: existing, error: null }),
            neq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }),
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: updated, error: null }),
            }),
          }),
        }),
      })),
    });

    const result = await useCase.execute(
      'd-1',
      { barcode: 'DOS-NEW-999', notes: 'Updated barcode sticker' },
      'org-lab',
      'user-1',
    );

    expect(result.barcode).toBe('DOS-NEW-999');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        entityId: 'd-1',
        oldValues: expect.objectContaining({ barcode: 'DOS-OLD' }),
      }),
    );
  });

  it('activa fallback en select y update cuando la columna barcode no existe en BD (42703)', async () => {
    let selectCalls = 0;
    let updateCalls = 0;

    supabase.getClient.mockReturnValue({
      from: jest.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => {
              selectCalls++;
              if (selectCalls === 1) {
                // Primer select con barcode falla con 42703
                return Promise.resolve({
                  data: null,
                  error: { code: '42703', message: 'column barcode does not exist' },
                });
              }
              // Segundo select (fallback) tiene éxito
              return Promise.resolve({
                data: { id: 'd-1', serial_number: 'SN-FALLBACK', internal_code: null },
                error: null,
              });
            },
          }),
        }),
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => {
                updateCalls++;
                if (updateCalls === 1) {
                  return Promise.resolve({
                    data: null,
                    error: { code: '42703', message: 'column barcode does not exist' },
                  });
                }
                return Promise.resolve({
                  data: { id: 'd-1', serial_number: 'SN-FALLBACK', notes: 'Updated' },
                  error: null,
                });
              },
            }),
          }),
        }),
      })),
    });

    const result = await useCase.execute('d-1', { notes: 'Updated' }, 'org-lab', 'user-1');

    expect(result.barcode).toBe('SN-FALLBACK');
    expect(selectCalls).toBe(2);
    expect(updateCalls).toBe(2);
  });
});
