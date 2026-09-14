import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AddServiceOrderItemUseCase } from './add-service-order-item.use-case';

describe('AddServiceOrderItemUseCase', () => {
  let supabase: { getClient: jest.Mock };
  let audit: { log: jest.Mock };
  let orgScope: {
    getOrganizationType: jest.Mock;
    getOwnClientIds: jest.Mock;
    isDosimeterOwnedByClient: jest.Mock;
  };
  let useCase: AddServiceOrderItemUseCase;

  const dto = { dosimeter_id: 'd-2', requested_action: 'lectura' };

  beforeEach(() => {
    supabase = { getClient: jest.fn() };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    orgScope = {
      getOrganizationType: jest.fn().mockResolvedValue('laboratory'),
      getOwnClientIds: jest.fn(),
      isDosimeterOwnedByClient: jest.fn().mockResolvedValue(true),
    };
    useCase = new AddServiceOrderItemUseCase(supabase as any, audit as any, orgScope as any);
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

  it('rejects adding an item when the order is not PENDING', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: { id: 'order-1', client_id: 'client-1', status: 'IN_PROCESS' } }),
          }),
        }),
      }),
    });

    await expect(useCase.execute('order-1', dto as any, 'org-1', 'user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects a dosimeter that does not belong to the order client', async () => {
    orgScope.isDosimeterOwnedByClient.mockResolvedValue(false);
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

    await expect(useCase.execute('order-1', dto as any, 'org-1', 'user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('raises ConflictException when the dosimeter is already an item of the order', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'service_orders') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: { id: 'order-1', client_id: 'client-1', status: 'PENDING' } }),
              }),
            }),
          };
        }
        if (table === 'service_order_items') {
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: null, error: { code: '23505' } }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    await expect(useCase.execute('order-1', dto as any, 'org-1', 'user-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('adds the item and logs the audit entry', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'service_orders') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: { id: 'order-1', client_id: 'client-1', status: 'PENDING' } }),
              }),
            }),
          };
        }
        if (table === 'service_order_items') {
          return {
            insert: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id: 'item-2', dosimeter_id: 'd-2', requested_action: 'lectura', status: 'PENDING' },
                    error: null,
                  }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    const result = await useCase.execute('order-1', dto as any, 'org-1', 'user-1');

    expect(result.id).toBe('item-2');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', entityName: 'service_order_items' }),
    );
  });
});
