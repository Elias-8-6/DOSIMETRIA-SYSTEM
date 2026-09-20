import { ForbiddenException } from '@nestjs/common';
import { GetClientDosimetersUseCase } from './get-client-dosimeters.use-case';

describe('GetClientDosimetersUseCase', () => {
  let supabase: { getClient: jest.Mock };
  let orgScope: { getOrganizationType: jest.Mock; getOwnClientIds: jest.Mock };
  let useCase: GetClientDosimetersUseCase;

  beforeEach(() => {
    supabase = { getClient: jest.fn() };
    orgScope = { getOrganizationType: jest.fn(), getOwnClientIds: jest.fn() };
    useCase = new GetClientDosimetersUseCase(supabase as any, orgScope as any);
  });

  it('allows laboratory org to query client dosimeters', async () => {
    orgScope.getOrganizationType.mockResolvedValue('laboratory');

    const fakeRows = [
      {
        id: 'assign-1',
        dosimeter_id: 'dos-1',
        status: 'activo',
        dosimeters: {
          id: 'dos-1',
          serial_number: 'SN-001',
          internal_code: 'INT-001',
          model: 'Harshaw 8807',
          manufacturer: 'Thermo',
          dosimeter_types: { id: 'type-1', code: 'TLD', name: 'TLD Personal', technology: 'TLD' },
          dosimeter_statuses: { id: 'st-1', code: 'ASIGNADO', name: 'Asignado' },
        },
        workers: {
          id: 'w-1',
          client_id: 'client-1',
          full_name: 'Juan Perez',
          document_number: '8-123-456',
        },
      },
    ];

    supabase.getClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            or: jest.fn().mockResolvedValue({ data: fakeRows, error: null }),
          }),
        }),
      }),
    });

    const result = await useCase.execute('client-1', 'org-lab');
    expect(result).toHaveLength(1);
    expect(result[0].serial_number).toBe('SN-001');
    expect(result[0].worker?.full_name).toBe('Juan Perez');
  });

  it('throws ForbiddenException when client org does not own client', async () => {
    orgScope.getOrganizationType.mockResolvedValue('client');
    orgScope.getOwnClientIds.mockResolvedValue(['other-client']);

    await expect(useCase.execute('client-1', 'client-org')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
