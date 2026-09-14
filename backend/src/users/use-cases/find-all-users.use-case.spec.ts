import { FindAllUsersUseCase } from './find-all-users.use-case';

describe('FindAllUsersUseCase tenant isolation', () => {
  it('always filters by organization_id from JWT context', async () => {
    const orgId = 'org-aaa';

    const query: any = {
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
    };

    query.then = (resolve: (value: unknown) => unknown) =>
      resolve({
        data: [
          {
            id: 'u1',
            full_name: 'User',
            email: 'u@test.com',
            status: 'active',
            created_at: new Date().toISOString(),
            user_roles: [{ roles: { code: 'admin_lab', name: 'Admin' } }],
          },
        ],
        error: null,
        count: 1,
      });

    const supabase = {
      getClient: () => ({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue(query),
        }),
      }),
    };

    const useCase = new FindAllUsersUseCase(supabase as any);
    const result = await useCase.execute(orgId);

    expect(query.eq).toHaveBeenCalledWith('organization_id', orgId);
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});
