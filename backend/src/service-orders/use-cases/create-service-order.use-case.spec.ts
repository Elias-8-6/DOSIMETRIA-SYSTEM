import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateServiceOrderUseCase } from './create-service-order.use-case';

describe('CreateServiceOrderUseCase', () => {
  let supabase: { getClient: jest.Mock };
  let audit: { log: jest.Mock };
  let orgScope: { getOrganizationType: jest.Mock; isDosimeterOwnedByClient: jest.Mock };
  let useCase: CreateServiceOrderUseCase;

  const dto = {
    client_id: 'client-1',
    service_type: 'lectura_dosis',
    items: [{ dosimeter_id: 'd-1', requested_action: 'lectura' }],
  };

  beforeEach(() => {
    supabase = { getClient: jest.fn() };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    orgScope = {
      getOrganizationType: jest.fn().mockResolvedValue('laboratory'),
      isDosimeterOwnedByClient: jest.fn().mockResolvedValue(true),
    };
    useCase = new CreateServiceOrderUseCase(supabase as any, audit as any, orgScope as any);
  });

  it('throws NotFoundException when the client does not exist', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'clients') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    await expect(useCase.execute(dto as any, 'org-1', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects a client org creating an order for a different client', async () => {
    orgScope.getOrganizationType.mockResolvedValue('client');
    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'clients') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: { id: 'client-1', organization_id: 'other-org' } }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    await expect(useCase.execute(dto as any, 'org-1', 'user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects when an item dosimeter does not belong to the client', async () => {
    orgScope.isDosimeterOwnedByClient.mockResolvedValue(false);
    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'clients') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: { id: 'client-1', organization_id: 'org-1' } }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    await expect(useCase.execute(dto as any, 'org-1', 'user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('creates the order with a generated order_number, inserts its items and logs the audit entry', async () => {
    const orderInsertSingle = jest.fn().mockResolvedValue({
      data: { id: 'order-1', order_number: 'OS-2026-00001', status: 'PENDING' },
      error: null,
    });
    const itemsSelect = jest.fn().mockResolvedValue({
      data: [{ id: 'item-1', dosimeter_id: 'd-1', requested_action: 'lectura', status: 'PENDING' }],
      error: null,
    });

    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'clients') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: { id: 'client-1', organization_id: 'org-1' } }),
              }),
            }),
          };
        }
        if (table === 'service_orders') {
          return {
            select: () => ({
              ilike: () => ({
                order: () => ({
                  limit: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
                }),
              }),
            }),
            insert: () => ({ select: () => ({ single: orderInsertSingle }) }),
          };
        }
        if (table === 'service_order_items') {
          return { insert: () => ({ select: itemsSelect }) };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    const result = await useCase.execute(dto as any, 'org-1', 'user-1');

    expect((result as any).order_number).toBe('OS-2026-00001');
    expect((result as any).service_order_items).toHaveLength(1);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', entityName: 'service_orders' }),
    );
  });
});
