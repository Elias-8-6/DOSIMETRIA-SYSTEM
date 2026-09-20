import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateReceptionUseCase } from './create-reception.use-case';

describe('CreateReceptionUseCase', () => {
  let supabase: { getClient: jest.Mock };
  let audit: { log: jest.Mock };
  let orgScope: { getOrganizationType: jest.Mock };
  let useCase: CreateReceptionUseCase;

  const validDto = {
    service_order_id: 'order-1',
    packaging_condition: 'integro' as const,
    observations: 'Paquete en buen estado',
    items: [
      {
        dosimeter_id: 'dos-1',
        received_condition: 'normal' as const,
        sealed: true,
        contaminated: false,
      },
    ],
  };

  beforeEach(() => {
    supabase = { getClient: jest.fn() };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    orgScope = {
      getOrganizationType: jest.fn().mockResolvedValue('laboratory'),
    };
    useCase = new CreateReceptionUseCase(supabase as any, audit as any, orgScope as any);
  });

  it('rejects when non-laboratory organization tries to register reception', async () => {
    orgScope.getOrganizationType.mockResolvedValue('client');
    await expect(useCase.execute(validDto, 'org-1', 'user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('throws NotFoundException when the service order does not exist', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'service_orders') {
          return {
            select: () => ({
              eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
            }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    });

    await expect(useCase.execute(validDto, 'org-1', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws BadRequestException if the service order is CANCELLED', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'service_orders') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: { id: 'order-1', order_number: 'OS-2026-00001', status: 'CANCELLED' },
                    error: null,
                  }),
              }),
            }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    });

    await expect(useCase.execute(validDto, 'org-1', 'user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws BadRequestException if the service order is already RECEIVED', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'service_orders') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: { id: 'order-1', order_number: 'OS-2026-00001', status: 'RECEIVED' },
                    error: null,
                  }),
              }),
            }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    });

    await expect(useCase.execute(validDto, 'org-1', 'user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws BadRequestException if a dosimeter does not belong to the service order', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'service_orders') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: { id: 'order-1', order_number: 'OS-2026-00001', status: 'PENDING' },
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (table === 'service_order_items') {
          return {
            select: () => ({
              eq: () =>
                Promise.resolve({
                  data: [{ id: 'so-item-1', dosimeter_id: 'other-dos' }],
                  error: null,
                }),
            }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    });

    await expect(useCase.execute(validDto, 'org-1', 'user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('successfully creates reception and triggers incident when contaminated', async () => {
    const contaminatedDto = {
      service_order_id: 'order-1',
      packaging_condition: 'danado_leve' as const,
      observations: 'Sello roto y posible contaminacion',
      items: [
        {
          dosimeter_id: 'dos-1',
          received_condition: 'contaminado' as const,
          sealed: false,
          contaminated: true,
        },
      ],
    };

    let incidentCreated = false;
    let orderUpdated = false;

    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'service_orders') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: { id: 'order-1', order_number: 'OS-2026-00001', status: 'PENDING' },
                    error: null,
                  }),
              }),
            }),
            update: () => ({
              eq: () => {
                orderUpdated = true;
                return Promise.resolve({ data: null, error: null });
              },
            }),
          };
        }
        if (table === 'service_order_items') {
          return {
            select: () => ({
              eq: () =>
                Promise.resolve({
                  data: [{ id: 'so-item-1', dosimeter_id: 'dos-1' }],
                  error: null,
                }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ data: null, error: null }),
            }),
          };
        }
        if (table === 'dosimeter_statuses') {
          return {
            select: () => ({
              in: () =>
                Promise.resolve({
                  data: [
                    { id: 'status-en-lab', code: 'EN_LAB' },
                    { id: 'status-incidente', code: 'INCIDENTE' },
                  ],
                  error: null,
                }),
            }),
          };
        }
        if (table === 'receptions') {
          return {
            select: () => ({
              ilike: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: () =>
                      Promise.resolve({
                        data: { reception_code: 'REC-2026-00001' },
                        error: null,
                      }),
                  }),
                }),
              }),
            }),
            insert: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      id: 'rec-1',
                      reception_code: 'REC-2026-00002',
                      service_order_id: 'order-1',
                      packaging_condition: 'danado_leve',
                    },
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (table === 'reception_items') {
          return {
            insert: () => ({
              select: () =>
                Promise.resolve({
                  data: [
                    {
                      id: 'ri-1',
                      dosimeter_id: 'dos-1',
                      received_condition: 'contaminado',
                      contaminated: true,
                    },
                  ],
                  error: null,
                }),
            }),
          };
        }
        if (table === 'incident_reports') {
          return {
            insert: () => {
              incidentCreated = true;
              return Promise.resolve({ data: null, error: null });
            },
          };
        }
        if (table === 'dosimeters') {
          return {
            update: () => ({
              eq: () => Promise.resolve({ data: null, error: null }),
            }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await useCase.execute(contaminatedDto, 'org-1', 'user-1');

    expect(result).toBeDefined();
    expect(result.id).toBe('rec-1');
    expect(incidentCreated).toBe(true);
    expect(orderUpdated).toBe(true);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE',
        entityName: 'receptions',
      }),
    );
  });
});
