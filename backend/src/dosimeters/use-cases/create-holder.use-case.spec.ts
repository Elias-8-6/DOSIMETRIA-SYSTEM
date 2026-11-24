import { ConflictException } from '@nestjs/common';
import { CreateHolderUseCase } from './create-holder.use-case';

describe('CreateHolderUseCase', () => {
  let supabase: { getClient: jest.Mock };
  let audit: { log: jest.Mock };
  let useCase: CreateHolderUseCase;

  beforeEach(() => {
    supabase = { getClient: jest.fn() };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    useCase = new CreateHolderUseCase(supabase as any, audit as any);
  });

  it('rejects when barcode already exists in holder_dosimeters', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'holder_dosimeters') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: 'h-1',
                      barcode: 'HLD-EXISTING',
                      status: 'disponible',
                      current_condition: 'integro',
                    },
                  }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    await expect(
      useCase.execute({ barcode: 'HLD-EXISTING' } as any, 'user-1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('assigns serial_number = barcode when serial_number is omitted and saves successfully', async () => {
    const insertedHolder = {
      id: 'h-new',
      barcode: 'HLD-NEW-01',
      serial_number: 'HLD-NEW-01',
      holder_color: 'azul',
      clip_type: 'pinza_cocodrilo',
      current_condition: 'integro',
      status: 'disponible',
      notes: null,
      photo_url: null,
    };

    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'holder_dosimeters') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: () => ({
                single: () => Promise.resolve({ data: insertedHolder, error: null }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    const result = await useCase.execute({ barcode: 'HLD-NEW-01' } as any, 'user-1');
    expect(result).toEqual(insertedHolder);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE',
        entityName: 'holder_dosimeters',
        entityId: 'h-new',
        newValues: expect.objectContaining({
          barcode: 'HLD-NEW-01',
          serial_number: 'HLD-NEW-01',
        }),
      }),
    );
  });

  it('auto generates a unique barcode when auto_generate_barcode is true', async () => {
    const insertedHolder = {
      id: 'h-autogen',
      barcode: 'HLD-202611-1234',
      serial_number: 'HLD-202611-1234',
      holder_color: 'rojo',
      status: 'disponible',
    };

    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'holder_dosimeters') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: () => ({
                single: () => Promise.resolve({ data: insertedHolder, error: null }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    const result = await useCase.execute(
      { auto_generate_barcode: true, holder_color: 'rojo' } as any,
      'user-1',
    );
    expect(result.id).toBe('h-autogen');
    expect(audit.log).toHaveBeenCalled();
  });
});
