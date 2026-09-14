import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UpdateServiceOrderUseCase } from './update-service-order.use-case';

describe('UpdateServiceOrderUseCase', () => {
  let supabase: { getClient: jest.Mock };
  let audit: { log: jest.Mock };
  let orgScope: { getOrganizationType: jest.Mock };
  let useCase: UpdateServiceOrderUseCase;

  const dto = { observations: 'urgente por favor' };

  beforeEach(() => {
    supabase = { getClient: jest.fn() };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    orgScope = { getOrganizationType: jest.fn().mockResolvedValue('laboratory') };
    useCase = new UpdateServiceOrderUseCase(supabase as any, audit as any, orgScope as any);
  });

  it('rejects when the requesting organization is not the laboratory', async () => {
    orgScope.getOrganizationType.mockResolvedValue('client');

    await expect(useCase.execute('order-1', dto as any, 'org-1', 'user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('throws NotFoundException when the order does not exist', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
      }),
    });

    await expect(useCase.execute('order-1', dto as any, 'org-1', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects editing an order in a terminal status', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: { id: 'order-1', status: 'COMPLETED' }, error: null }),
          }),
        }),
      }),
    });

    await expect(useCase.execute('order-1', dto as any, 'org-1', 'user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('updates only the provided fields and logs the audit entry', async () => {
    const updateSingle = jest.fn().mockResolvedValue({
      data: { id: 'order-1', order_number: 'OS-2026-00001', due_date: null, observations: 'urgente por favor', priority: 'normal' },
      error: null,
    });
    const updateMock = jest.fn().mockReturnValue({ eq: () => ({ select: () => ({ single: updateSingle }) }) });

    supabase.getClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: { id: 'order-1', status: 'PENDING', due_date: null, observations: null, priority: 'normal' },
                error: null,
              }),
          }),
        }),
        update: updateMock,
      }),
    });

    const result = await useCase.execute('order-1', dto as any, 'org-1', 'user-1');

    expect(updateMock).toHaveBeenCalledWith({ observations: 'urgente por favor' });
    expect(result.observations).toBe('urgente por favor');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'UPDATE', entityName: 'service_orders' }),
    );
  });
});
