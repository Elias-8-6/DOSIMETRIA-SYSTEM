import { ConflictException, ForbiddenException } from '@nestjs/common';
import { CreateDosimeterUseCase } from './create-dosimeter.use-case';

describe('CreateDosimeterUseCase', () => {
  let supabase: { getClient: jest.Mock };
  let audit: { log: jest.Mock };
  let orgScope: { getOrganizationType: jest.Mock };
  let useCase: CreateDosimeterUseCase;

  beforeEach(() => {
    supabase = { getClient: jest.fn() };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    orgScope = { getOrganizationType: jest.fn().mockResolvedValue('laboratory') };
    useCase = new CreateDosimeterUseCase(supabase as any, audit as any, orgScope as any);
  });

  it('rejects if organization is not laboratory', async () => {
    orgScope.getOrganizationType.mockResolvedValue('client');
    await expect(
      useCase.execute(
        { serial_number: 'SN-001', dosimeter_type_id: 'type-1' },
        'org-client',
        'user-1',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects if serial_number already exists', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'dosimeters') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { id: 'existing-id' }, error: null }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    await expect(
      useCase.execute(
        { serial_number: 'SN-DUPLICATE', dosimeter_type_id: 'type-1' },
        'org-lab',
        'user-1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects if barcode already exists', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'dosimeters') {
          return {
            select: () => ({
              eq: (col: string, val: string) => ({
                maybeSingle: () => {
                  if (col === 'serial_number') return Promise.resolve({ data: null, error: null });
                  if (col === 'barcode') return Promise.resolve({ data: { id: 'd-bar' }, error: null });
                  return Promise.resolve({ data: null, error: null });
                },
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    await expect(
      useCase.execute(
        { serial_number: 'SN-NEW', barcode: 'BAR-COLLISION', dosimeter_type_id: 'type-1' },
        'org-lab',
        'user-1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('creates dosimeter with provided barcode and logs audit', async () => {
    const createdRecord = {
      id: 'd-new',
      serial_number: 'SN-OK',
      barcode: 'BAR-CUSTOM-123',
      internal_code: 'INT-01',
      status_id: 'status-disp',
      current_condition: 'normal',
      reusable: true,
      created_at: '2026-11-26T12:00:00Z',
    };

    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'dosimeter_statuses') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: { id: 'status-disp' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'dosimeters') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
            insert: (payload: any) => ({
              select: () => ({
                single: () => Promise.resolve({ data: { ...createdRecord, ...payload }, error: null }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    const result = await useCase.execute(
      {
        serial_number: 'SN-OK',
        barcode: 'BAR-CUSTOM-123',
        internal_code: 'INT-01',
        dosimeter_type_id: 'type-1',
      },
      'org-lab',
      'user-1',
    );

    expect(result.id).toBe('d-new');
    expect(result.barcode).toBe('BAR-CUSTOM-123');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE',
        entityName: 'dosimeters',
        entityId: 'd-new',
      }),
    );
  });

  it('auto-generates unique barcode when auto_generate_barcode is true', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'dosimeter_statuses') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: { id: 'status-disp' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'dosimeters') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
            insert: (payload: any) => ({
              select: () => ({
                single: () => Promise.resolve({ data: { id: 'd-autogen', ...payload }, error: null }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    const result = await useCase.execute(
      {
        serial_number: 'SN-AUTO',
        dosimeter_type_id: 'type-1',
        auto_generate_barcode: true,
      },
      'org-lab',
      'user-1',
    );

    expect(result.barcode).toMatch(/^DOS-\d{6}-\w+/);
  });
});
