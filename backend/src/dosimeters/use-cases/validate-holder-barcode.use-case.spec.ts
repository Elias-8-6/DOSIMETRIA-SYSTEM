import { ValidateHolderBarcodeUseCase } from './validate-holder-barcode.use-case';

describe('ValidateHolderBarcodeUseCase', () => {
  let supabase: { getClient: jest.Mock };
  let useCase: ValidateHolderBarcodeUseCase;

  beforeEach(() => {
    supabase = { getClient: jest.fn() };
    useCase = new ValidateHolderBarcodeUseCase(supabase as any);
  });

  it('returns exists: false when barcode is not found', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'holder_dosimeters') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    const result = await useCase.execute('HLD-FREE');
    expect(result.exists).toBe(false);
    expect(result.holder).toBeNull();
    expect(result.message).toContain('disponible');
  });

  it('returns exists: true with holder details when barcode exists', async () => {
    const existingHolderData = {
      id: 'h-100',
      barcode: 'HLD-BUSY',
      serial_number: 'HLD-BUSY',
      status: 'ensamblado',
      current_condition: 'integro',
      holder_color: 'azul',
      clip_type: 'pinza_cocodrilo',
      notes: null,
      photo_url: null,
      created_at: '2026-11-20T10:00:00Z',
    };

    const assemblyData = {
      id: 'asm-1',
      is_active: true,
      assembled_at: '2026-11-20T10:00:00Z',
      tld_cards: {
        id: 'c-1',
        serial_number: 'TLD-900',
        elements_count: 2,
        tld_material: 'LiF:Mg,Ti',
        status: 'ensamblado',
      },
    };

    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'holder_dosimeters') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: existingHolderData, error: null }),
              }),
            }),
          };
        }
        if (table === 'holder_tld_assemblies') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: assemblyData, error: null }),
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    const result = await useCase.execute('HLD-BUSY');
    expect(result.exists).toBe(true);
    expect(result.holder).toBeDefined();
    expect((result.holder as any)?.active_assembly?.tld_card?.serial_number).toBe('TLD-900');
  });
});
