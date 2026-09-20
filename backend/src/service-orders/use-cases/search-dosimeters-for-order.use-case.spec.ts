import { ForbiddenException } from '@nestjs/common';
import { SearchDosimetersForOrderUseCase } from './search-dosimeters-for-order.use-case';

describe('SearchDosimetersForOrderUseCase', () => {
  let supabase: { getClient: jest.Mock };
  let orgScope: { getOrganizationType: jest.Mock; getOwnClientIds: jest.Mock };
  let useCase: SearchDosimetersForOrderUseCase;

  beforeEach(() => {
    supabase = { getClient: jest.fn() };
    orgScope = { getOrganizationType: jest.fn(), getOwnClientIds: jest.fn() };
    useCase = new SearchDosimetersForOrderUseCase(supabase as any, orgScope as any);
  });

  it('throws ForbiddenException when client org tries to search for another client', async () => {
    orgScope.getOrganizationType.mockResolvedValue('client');
    orgScope.getOwnClientIds.mockResolvedValue(['different-client']);

    await expect(useCase.execute('client-1', 'client-org', 'SN-01')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('correctly maps origins: client, other_client, laboratory, unassigned', async () => {
    orgScope.getOrganizationType.mockResolvedValue('laboratory');

    const fakeRows = [
      {
        id: 'd-1',
        serial_number: 'SN-001',
        internal_code: 'INT-001',
        dosimeter_types: { id: 't1', code: 'TLD', name: 'TLD Personal', technology: 'TLD' },
        dosimeter_statuses: { id: 's1', code: 'ASIGNADO', name: 'Asignado' },
        dosimeter_assignments: [
          {
            id: 'a1',
            status: 'activo',
            workers: { id: 'w1', client_id: 'client-1', full_name: 'Ana Gomez', document_number: '123' },
          },
        ],
      },
      {
        id: 'd-2',
        serial_number: 'SN-002',
        internal_code: 'INT-002',
        dosimeter_types: { id: 't1', code: 'TLD', name: 'TLD Personal', technology: 'TLD' },
        dosimeter_statuses: { id: 's1', code: 'ASIGNADO', name: 'Asignado' },
        dosimeter_assignments: [
          {
            id: 'a2',
            status: 'activo',
            workers: { id: 'w2', client_id: 'other-client', full_name: 'Carlos Ruiz', document_number: '456' },
          },
        ],
      },
      {
        id: 'd-3',
        serial_number: 'SN-003',
        internal_code: 'LAB-AREA-01',
        dosimeter_types: { id: 't2', code: 'TLD_AREA', name: 'TLD Área', technology: 'TLD' },
        dosimeter_statuses: { id: 's2', code: 'DISPONIBLE', name: 'Disponible' },
        dosimeter_assignments: [],
      },
      {
        id: 'd-4',
        serial_number: 'SN-004',
        internal_code: null,
        dosimeter_types: { id: 't1', code: 'TLD', name: 'TLD Personal', technology: 'TLD' },
        dosimeter_statuses: { id: 's2', code: 'DISPONIBLE', name: 'Disponible' },
        dosimeter_assignments: [],
      },
    ];

    const chain: any = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      then: (resolve: any) => resolve({ data: fakeRows, error: null }),
    };

    supabase.getClient.mockReturnValue({
      from: jest.fn().mockReturnValue(chain),
    });

    const results = await useCase.execute('client-1', 'org-lab', 'SN');

    expect(results).toHaveLength(4);
    expect(results[0].origin).toBe('client');
    expect(results[0].assigned_worker?.full_name).toBe('Ana Gomez');

    expect(results[1].origin).toBe('other_client');
    expect(results[1].assigned_worker?.full_name).toBe('Carlos Ruiz');

    expect(results[2].origin).toBe('laboratory');
    expect(results[3].origin).toBe('unassigned');
  });
});
