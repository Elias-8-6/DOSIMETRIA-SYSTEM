import { FindAllServiceOrdersUseCase } from './find-all-service-orders.use-case';

describe('FindAllServiceOrdersUseCase', () => {
  let supabase: { getClient: jest.Mock };
  let orgScope: { getOrganizationType: jest.Mock; getOwnClientIds: jest.Mock };
  let useCase: FindAllServiceOrdersUseCase;

  beforeEach(() => {
    supabase = { getClient: jest.fn() };
    orgScope = {
      getOrganizationType: jest.fn().mockResolvedValue('laboratory'),
      getOwnClientIds: jest.fn(),
    };
    useCase = new FindAllServiceOrdersUseCase(supabase as any, orgScope as any);
  });

  it('returns an empty page without querying when a client org owns no client record', async () => {
    orgScope.getOrganizationType.mockResolvedValue('client');
    orgScope.getOwnClientIds.mockResolvedValue([]);

    const result = await useCase.execute('org-1');

    expect(result).toEqual({ items: [], total: 0 });
    expect(supabase.getClient).not.toHaveBeenCalled();
  });

  it('scopes the query to the client org own client ids', async () => {
    orgScope.getOrganizationType.mockResolvedValue('client');
    orgScope.getOwnClientIds.mockResolvedValue(['client-1']);

    const inMock = jest.fn().mockReturnThis();
    const rangeMock = jest.fn().mockResolvedValue({ data: [], error: null, count: 0 });
    const queryable: any = {
      order: jest.fn().mockReturnThis(),
      in: inMock,
      range: rangeMock,
    };
    supabase.getClient.mockReturnValue({
      from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue(queryable) }),
    });

    await useCase.execute('org-1');

    expect(inMock).toHaveBeenCalledWith('client_id', ['client-1']);
  });

  it('maps the embedded item count and returns the total', async () => {
    const rangeMock = jest.fn().mockResolvedValue({
      data: [
        {
          id: 'order-1',
          order_number: 'OS-2026-00001',
          service_order_items: [{ count: 3 }],
        },
      ],
      error: null,
      count: 1,
    });
    supabase.getClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnThis(),
          range: rangeMock,
        }),
      }),
    });

    const result = await useCase.execute('org-1');

    expect(result.total).toBe(1);
    expect(result.items[0]).toEqual({
      id: 'order-1',
      order_number: 'OS-2026-00001',
      items_count: 3,
    });
  });

  it('throws when the query fails', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' }, count: null }),
        }),
      }),
    });

    await expect(useCase.execute('org-1')).rejects.toThrow(
      'No se pudo obtener el listado de órdenes de servicio',
    );
  });
});
