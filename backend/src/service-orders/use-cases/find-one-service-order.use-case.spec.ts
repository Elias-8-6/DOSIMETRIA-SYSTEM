import { NotFoundException } from '@nestjs/common';
import { FindOneServiceOrderUseCase } from './find-one-service-order.use-case';

describe('FindOneServiceOrderUseCase', () => {
  let supabase: { getClient: jest.Mock };
  let orgScope: { getOrganizationType: jest.Mock };
  let useCase: FindOneServiceOrderUseCase;

  const orderRow = {
    id: 'order-1',
    order_number: 'OS-2026-00001',
    status: 'PENDING',
    clients: { id: 'client-1', name: 'Hospital', organization_id: 'client-org-1' },
    service_order_items: [],
  };

  beforeEach(() => {
    supabase = { getClient: jest.fn() };
    orgScope = { getOrganizationType: jest.fn() };
    useCase = new FindOneServiceOrderUseCase(supabase as any, orgScope as any);
  });

  it('throws NotFoundException when the order does not exist', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
      }),
    });

    await expect(useCase.execute('missing', 'org-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('hides the order (404) from a client org that does not own it', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: () => ({
          eq: () => ({ maybeSingle: () => Promise.resolve({ data: orderRow, error: null }) }),
        }),
      }),
    });
    orgScope.getOrganizationType.mockResolvedValue('client');

    await expect(useCase.execute('order-1', 'other-org')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns the order without leaking the internal clients.organization_id field', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: () => ({
          eq: () => ({ maybeSingle: () => Promise.resolve({ data: orderRow, error: null }) }),
        }),
      }),
    });
    orgScope.getOrganizationType.mockResolvedValue('client');

    const result = await useCase.execute('order-1', 'client-org-1');

    expect(result.clients).toEqual({ id: 'client-1', name: 'Hospital' });
  });

  it('allows a laboratory org to read any order', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: () => ({
          eq: () => ({ maybeSingle: () => Promise.resolve({ data: orderRow, error: null }) }),
        }),
      }),
    });
    orgScope.getOrganizationType.mockResolvedValue('laboratory');

    await expect(useCase.execute('order-1', 'lab-org')).resolves.toMatchObject({ id: 'order-1' });
  });
});
