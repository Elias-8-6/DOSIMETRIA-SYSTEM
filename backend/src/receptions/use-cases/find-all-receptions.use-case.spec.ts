import { FindAllReceptionsUseCase } from './find-all-receptions.use-case';

describe('FindAllReceptionsUseCase', () => {
  let supabase: { getClient: jest.Mock };
  let orgScope: { getOrganizationType: jest.Mock; getOwnClientIds: jest.Mock };
  let useCase: FindAllReceptionsUseCase;

  beforeEach(() => {
    supabase = { getClient: jest.fn() };
    orgScope = {
      getOrganizationType: jest.fn().mockResolvedValue('laboratory'),
      getOwnClientIds: jest.fn().mockResolvedValue([]),
    };
    useCase = new FindAllReceptionsUseCase(supabase as any, orgScope as any);
  });

  it('returns paginated items for laboratory', async () => {
    const mockData = [
      {
        id: 'rec-1',
        reception_code: 'REC-2026-00001',
        packaging_condition: 'integro',
        reception_items: [{ count: 3 }],
      },
    ];

    supabase.getClient.mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: mockData, error: null, count: 1 }),
      })),
    });

    const result = await useCase.execute('org-lab', undefined, undefined, undefined, undefined, 1, 10);

    expect(result.total).toBe(1);
    expect(result.items[0].items_count).toBe(3);
    expect(result.items[0].reception_code).toBe('REC-2026-00001');
  });

  it('returns empty list if client organization has no client records', async () => {
    orgScope.getOrganizationType.mockResolvedValue('client');
    orgScope.getOwnClientIds.mockResolvedValue([]);

    const result = await useCase.execute('org-client');
    expect(result).toEqual({ items: [], total: 0 });
  });
});
