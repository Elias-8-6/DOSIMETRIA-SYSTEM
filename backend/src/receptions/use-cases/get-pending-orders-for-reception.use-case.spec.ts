import { ForbiddenException } from '@nestjs/common';
import { GetPendingOrdersForReceptionUseCase } from './get-pending-orders-for-reception.use-case';

describe('GetPendingOrdersForReceptionUseCase', () => {
  let supabase: { getClient: jest.Mock };
  let orgScope: { getOrganizationType: jest.Mock };
  let useCase: GetPendingOrdersForReceptionUseCase;

  beforeEach(() => {
    supabase = { getClient: jest.fn() };
    orgScope = {
      getOrganizationType: jest.fn().mockResolvedValue('laboratory'),
    };
    useCase = new GetPendingOrdersForReceptionUseCase(supabase as any, orgScope as any);
  });

  it('rejects when non-laboratory organization tries to query pending orders', async () => {
    orgScope.getOrganizationType.mockResolvedValue('client');
    await expect(useCase.execute('org-client')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('queries service_orders filtering strictly by status PENDING', async () => {
    const mockEq = jest.fn().mockReturnThis();
    const mockOrder = jest.fn().mockResolvedValue({
      data: [
        { id: 'order-1', order_number: 'OS-2026-00001', status: 'PENDING', service_order_items: [] },
      ],
      error: null,
    });

    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        expect(table).toBe('service_orders');
        return {
          select: jest.fn().mockReturnValue({
            eq: mockEq.mockReturnValue({
              order: mockOrder,
            }),
          }),
        };
      }),
    });

    const result = await useCase.execute('org-lab');

    expect(mockEq).toHaveBeenCalledWith('status', 'PENDING');
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('PENDING');
  });

  it('applies search query on order_number when provided', async () => {
    const mockIlike = jest.fn().mockResolvedValue({
      data: [{ id: 'order-1', order_number: 'OS-2026-00001', status: 'PENDING' }],
      error: null,
    });

    supabase.getClient.mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              ilike: mockIlike,
            }),
          }),
        }),
      })),
    });

    const result = await useCase.execute('org-lab', '00001');

    expect(mockIlike).toHaveBeenCalledWith('order_number', '%00001%');
    expect(result).toHaveLength(1);
  });
});
