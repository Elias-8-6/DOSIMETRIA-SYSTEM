import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RemoveServiceOrderItemUseCase } from './remove-service-order-item.use-case';

describe('RemoveServiceOrderItemUseCase', () => {
  let supabase: { getClient: jest.Mock };
  let audit: { log: jest.Mock };
  let orgScope: { getOrganizationType: jest.Mock; getOwnClientIds: jest.Mock };
  let useCase: RemoveServiceOrderItemUseCase;

  beforeEach(() => {
    supabase = { getClient: jest.fn() };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    orgScope = {
      getOrganizationType: jest.fn().mockResolvedValue('laboratory'),
      getOwnClientIds: jest.fn(),
    };
    useCase = new RemoveServiceOrderItemUseCase(supabase as any, audit as any, orgScope as any);
  });

  it('throws NotFoundException when the order does not exist', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
      }),
    });

    await expect(useCase.execute('order-1', 'item-1', 'org-1', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects removing an item when the order is not PENDING', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: { id: 'order-1', client_id: 'client-1', status: 'RECEIVED' } }),
          }),
        }),
      }),
    });

    await expect(useCase.execute('order-1', 'item-1', 'org-1', 'user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws NotFoundException when the item does not belong to the order', async () => {
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
            select: () => ({
              eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    await expect(useCase.execute('order-1', 'item-1', 'org-1', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects removing the last remaining item of the order', async () => {
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
            select: jest.fn((fields: string) => {
              if (fields === 'id') {
                // Both the "item belongs to order" lookup and the
                // "remaining items" count share the same select('id') shape.
                return {
                  eq: (col: string) => {
                    if (col === 'id') {
                      return { eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 'item-1' } }) }) };
                    }
                    return Promise.resolve({ data: [{ id: 'item-1' }] });
                  },
                };
              }
              throw new Error(`unexpected fields ${fields}`);
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    await expect(useCase.execute('order-1', 'item-1', 'org-1', 'user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('removes the item and logs the audit entry when more than one item remains', async () => {
    const deleteMock = jest.fn().mockReturnValue({ eq: () => Promise.resolve({ error: null }) });

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
            select: jest.fn(() => ({
              eq: (col: string) => {
                if (col === 'id') {
                  return { eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 'item-1' } }) }) };
                }
                return Promise.resolve({ data: [{ id: 'item-1' }, { id: 'item-2' }] });
              },
            })),
            delete: deleteMock,
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    const result = await useCase.execute('order-1', 'item-1', 'org-1', 'user-1');

    expect(result).toEqual({ id: 'item-1', removed: true });
    expect(deleteMock).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DELETE', entityName: 'service_order_items' }),
    );
  });
});
