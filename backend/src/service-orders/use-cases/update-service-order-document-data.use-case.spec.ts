import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UpdateServiceOrderDocumentDataUseCase } from './update-service-order-document-data.use-case';

describe('UpdateServiceOrderDocumentDataUseCase', () => {
  let supabase: { getClient: jest.Mock };
  let audit: { log: jest.Mock };
  let orgScope: { getOrganizationType: jest.Mock };
  let useCase: UpdateServiceOrderDocumentDataUseCase;

  beforeEach(() => {
    supabase = { getClient: jest.fn() };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    orgScope = { getOrganizationType: jest.fn().mockResolvedValue('laboratory') };
    useCase = new UpdateServiceOrderDocumentDataUseCase(
      supabase as any,
      audit as any,
      orgScope as any,
    );
  });

  it('throws NotFoundException when the order does not exist', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
    });

    await expect(
      useCase.execute('order-1', { document_data: {} }, 'org-lab', 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequestException when order is CANCELLED', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: () =>
              Promise.resolve({
                data: { id: 'order-1', status: 'CANCELLED', document_data: {} },
                error: null,
              }),
          }),
        }),
      }),
    });

    await expect(
      useCase.execute('order-1', { document_data: { repdos01: { company_signee: 'Test' } } }, 'org-lab', 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('successfully updates document_data and records ISO 17025 audit log', async () => {
    const existingOrder = {
      id: 'order-1',
      status: 'PENDING',
      document_data: { repdos01: { company_signee: 'Original Signee' } },
      clients: { organization_id: 'org-lab' },
    };

    const updateMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: () =>
            Promise.resolve({
              data: {
                id: 'order-1',
                document_data: {
                  repdos01: { company_signee: 'New Signee' },
                },
              },
              error: null,
            }),
        }),
      }),
    });

    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'service_orders') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: () => Promise.resolve({ data: existingOrder, error: null }),
              }),
            }),
            update: updateMock,
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    const result = await useCase.execute(
      'order-1',
      { document_data: { repdos01: { company_signee: 'New Signee' } } },
      'org-lab',
      'user-1',
    );

    expect(result.document_data.repdos01.company_signee).toBe('New Signee');
    expect(audit.log).toHaveBeenCalledWith({
      userId: 'user-1',
      entityName: 'service_orders',
      entityId: 'order-1',
      action: 'UPDATE',
      oldValues: {
        document_data: { repdos01: { company_signee: 'Original Signee' } },
      },
      newValues: {
        document_data: { repdos01: { company_signee: 'New Signee' } },
      },
    });
  });
});
