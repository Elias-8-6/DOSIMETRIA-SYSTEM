import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UpdateServiceOrderStatusUseCase } from './update-service-order-status.use-case';

describe('UpdateServiceOrderStatusUseCase', () => {
  let supabase: { getClient: jest.Mock };
  let audit: { log: jest.Mock };
  let orgScope: { getOrganizationType: jest.Mock };
  let useCase: UpdateServiceOrderStatusUseCase;

  beforeEach(() => {
    supabase = { getClient: jest.fn() };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    orgScope = { getOrganizationType: jest.fn().mockResolvedValue('laboratory') };
    useCase = new UpdateServiceOrderStatusUseCase(supabase as any, audit as any, orgScope as any);
  });

  it('rejects when the requesting organization is not the laboratory', async () => {
    orgScope.getOrganizationType.mockResolvedValue('client');

    await expect(
      useCase.execute('order-1', { status: 'RECEIVED' } as any, 'org-1', 'user-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws NotFoundException when the order does not exist', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
      }),
    });

    await expect(
      useCase.execute('order-1', { status: 'RECEIVED' } as any, 'org-1', 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects an illegal transition', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: { id: 'order-1', status: 'PENDING' } }),
          }),
        }),
      }),
    });

    await expect(
      useCase.execute('order-1', { status: 'COMPLETED' } as any, 'org-1', 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects setting the same status', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: { id: 'order-1', status: 'PENDING' } }),
          }),
        }),
      }),
    });

    await expect(
      useCase.execute('order-1', { status: 'PENDING' } as any, 'org-1', 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows the QC_REVIEW -> IN_PROCESS rework transition', async () => {
    const updateSingle = jest
      .fn()
      .mockResolvedValue({ data: { id: 'order-1', order_number: 'OS-2026-00001', status: 'IN_PROCESS' }, error: null });

    supabase.getClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: { id: 'order-1', status: 'QC_REVIEW' } }),
          }),
        }),
        update: () => ({ eq: () => ({ select: () => ({ single: updateSingle }) }) }),
      }),
    });

    const result = await useCase.execute(
      'order-1',
      { status: 'IN_PROCESS' } as any,
      'org-1',
      'user-1',
    );

    expect(result.status).toBe('IN_PROCESS');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'STATUS_CHANGE',
        oldValues: { status: 'QC_REVIEW' },
        newValues: { status: 'IN_PROCESS' },
      }),
    );
  });
});
