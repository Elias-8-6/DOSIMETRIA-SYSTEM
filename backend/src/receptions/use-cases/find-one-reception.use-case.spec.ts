import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { FindOneReceptionUseCase } from './find-one-reception.use-case';

describe('FindOneReceptionUseCase', () => {
  let supabase: { getClient: jest.Mock };
  let orgScope: { getOrganizationType: jest.Mock };
  let useCase: FindOneReceptionUseCase;

  beforeEach(() => {
    supabase = { getClient: jest.fn() };
    orgScope = {
      getOrganizationType: jest.fn().mockResolvedValue('laboratory'),
    };
    useCase = new FindOneReceptionUseCase(supabase as any, orgScope as any);
  });

  it('throws NotFoundException if reception does not exist', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })),
    });

    await expect(useCase.execute('rec-missing', 'org-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws ForbiddenException if client org does not own the order', async () => {
    orgScope.getOrganizationType.mockResolvedValue('client');
    supabase.getClient.mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            id: 'rec-1',
            service_orders: {
              clients: { organization_id: 'other-org' },
            },
            reception_items: [],
          },
          error: null,
        }),
      })),
    });

    await expect(useCase.execute('rec-1', 'my-org')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('returns reception with enriched incident reports for laboratory', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'receptions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: 'rec-1',
                reception_code: 'REC-2026-00001',
                reception_items: [{ id: 'ri-1', dosimeter_id: 'dos-1' }],
                service_orders: {
                  clients: { organization_id: 'org-1' },
                },
              },
              error: null,
            }),
          };
        }
        if (table === 'incident_reports') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'inc-1',
                  dosimeter_id: 'dos-1',
                  incident_type: 'contaminacion',
                },
              ],
              error: null,
            }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await useCase.execute('rec-1', 'org-1');
    expect(result.id).toBe('rec-1');
    expect(result.reception_items[0].incident_reports).toHaveLength(1);
    expect(result.reception_items[0].incident_reports[0].incident_type).toBe('contaminacion');
  });
});
