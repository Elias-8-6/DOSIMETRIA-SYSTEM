import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CancelServiceOrderUseCase } from './cancel-service-order.use-case';

describe('CancelServiceOrderUseCase', () => {
  let supabase: { getClient: jest.Mock };
  let audit: { log: jest.Mock };
  let orgScope: { getOrganizationType: jest.Mock; getOwnClientIds: jest.Mock };
  let useCase: CancelServiceOrderUseCase;

  beforeEach(() => {
    supabase = { getClient: jest.fn() };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    orgScope = {
      getOrganizationType: jest.fn().mockResolvedValue('laboratory'),
      getOwnClientIds: jest.fn(),
    };
    useCase = new CancelServiceOrderUseCase(supabase as any, audit as any, orgScope as any);
  });

  it('throws NotFoundException when the order does not exist', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
      }),
    });

    await expect(useCase.execute('order-1', 'org-1', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('hides the order (404) from a client org that does not own it -- regression: cross-org leakage', async () => {
    orgScope.getOrganizationType.mockResolvedValue('client');
    orgScope.getOwnClientIds.mockResolvedValue(['client-other']);
    supabase.getClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: { id: 'order-1', client_id: 'client-1', status: 'PENDING' } }),
          }),
        }),
      }),
    });

    await expect(useCase.execute('order-1', 'other-org', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects cancelling an order already in a terminal status', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: { id: 'order-1', client_id: 'client-1', status: 'COMPLETED' } }),
          }),
        }),
      }),
    });

    await expect(useCase.execute('order-1', 'org-1', 'user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('cancels the order and logs the audit entry', async () => {
    const updateSingle = jest.fn().mockResolvedValue({
      data: { id: 'order-1', order_number: 'OS-2026-00001', status: 'CANCELLED' },
      error: null,
    });

    supabase.getClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: { id: 'order-1', client_id: 'client-1', status: 'PENDING' } }),
          }),
        }),
        update: () => ({ eq: () => ({ select: () => ({ single: updateSingle }) }) }),
      }),
    });

    const result = await useCase.execute('order-1', 'org-1', 'user-1');

    expect(result.status).toBe('CANCELLED');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'STATUS_CHANGE', newValues: { status: 'CANCELLED' } }),
    );
  });
});
