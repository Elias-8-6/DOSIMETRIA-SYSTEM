import { FindAllDosimetersUseCase } from './find-all-dosimeters.use-case';

describe('FindAllDosimetersUseCase', () => {
  let useCase: FindAllDosimetersUseCase;
  let supabase: { getClient: jest.Mock };
  let orgScope: { getOrganizationType: jest.Mock; getAllowedDosimeterIds: jest.Mock };

  beforeEach(() => {
    supabase = {
      getClient: jest.fn(),
    };
    orgScope = {
      getOrganizationType: jest.fn().mockResolvedValue('laboratory'),
      getAllowedDosimeterIds: jest.fn().mockResolvedValue([]),
    };
    useCase = new FindAllDosimetersUseCase(supabase as any, orgScope as any);
  });

  it('debe listar dosímetros correctamente cuando la columna barcode existe', async () => {
    const mockData = [
      { id: 'd-1', serial_number: 'SN-001', barcode: 'DOS-001' },
      { id: 'd-2', serial_number: 'SN-002', barcode: 'DOS-002' },
    ];

    const mockQuery: any = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      then: (resolve: any) => resolve({ data: mockData, error: null, count: 2 }),
    };

    supabase.getClient.mockReturnValue({
      from: jest.fn().mockReturnValue(mockQuery),
    });

    const result = await useCase.execute('org-lab');

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
    expect((result.items[0] as any).barcode).toBe('DOS-001');
  });

  it('debe activar el fallback y mapear barcode = serial_number si la columna barcode no existe (código 42703)', async () => {
    const mockLegacyData = [
      { id: 'd-1', serial_number: 'SN-001' },
      { id: 'd-2', serial_number: 'SN-002' },
    ];

    let queryCallCount = 0;
    const mockClient = {
      from: jest.fn().mockImplementation(() => {
        queryCallCount++;
        if (queryCallCount === 1) {
          // Primera llamada con barcode: falla con 42703 (undefined_column)
          return {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            range: jest.fn().mockReturnThis(),
            then: (resolve: any) =>
              resolve({
                data: null,
                error: { code: '42703', message: 'column dosimeters.barcode does not exist' },
                count: null,
              }),
          };
        } else {
          // Segunda llamada sin barcode: éxito
          return {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            range: jest.fn().mockReturnThis(),
            then: (resolve: any) =>
              resolve({
                data: mockLegacyData,
                error: null,
                count: 2,
              }),
          };
        }
      }),
    };

    supabase.getClient.mockReturnValue(mockClient);

    const result = await useCase.execute('org-lab');

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
    expect((result.items[0] as any).barcode).toBe('SN-001');
    expect((result.items[1] as any).barcode).toBe('SN-002');
  });

  it('en modo fallback, filtra por serial_number cuando se provee barcode', async () => {
    let fallbackQueryEqMock: jest.Mock;
    let queryCallCount = 0;

    const mockClient = {
      from: jest.fn().mockImplementation(() => {
        queryCallCount++;
        if (queryCallCount === 1) {
          return {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            range: jest.fn().mockReturnThis(),
            then: (resolve: any) =>
              resolve({
                data: null,
                error: { code: '42703', message: 'column dosimeters.barcode does not exist' },
                count: null,
              }),
          };
        } else {
          fallbackQueryEqMock = jest.fn().mockReturnThis();
          const queryObj: any = {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            eq: fallbackQueryEqMock,
            range: jest.fn().mockReturnThis(),
            then: (resolve: any) =>
              resolve({
                data: [{ id: 'd-1', serial_number: 'DOS-TEST' }],
                error: null,
                count: 1,
              }),
          };
          return queryObj;
        }
      }),
    };

    supabase.getClient.mockReturnValue(mockClient);

    const result = await useCase.execute('org-lab', undefined, undefined, undefined, undefined, 1, 10, 'DOS-TEST');

    expect(fallbackQueryEqMock!).toHaveBeenCalledWith('serial_number', 'DOS-TEST');
    expect(result.items).toHaveLength(1);
    expect((result.items[0] as any).barcode).toBe('DOS-TEST');
  });

  it('lanza Error cuando tanto la consulta inicial como el fallback fallan', async () => {
    let queryCallCount = 0;
    const mockClient = {
      from: jest.fn().mockImplementation(() => {
        queryCallCount++;
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockReturnThis(),
          then: (resolve: any) =>
            resolve({
              data: null,
              error: { code: '42703', message: 'column dosimeters.barcode does not exist' },
              count: null,
            }),
        };
      }),
    };

    supabase.getClient.mockReturnValue(mockClient);

    await expect(useCase.execute('org-lab')).rejects.toThrow('No se pudo obtener el listado de dosímetros');
  });

  it('debe restringir por allowedIds si la organización es de tipo client', async () => {
    orgScope.getOrganizationType.mockResolvedValue('client');
    orgScope.getAllowedDosimeterIds.mockResolvedValue(['d-1']);

    const mockData = [{ id: 'd-1', serial_number: 'SN-001', barcode: 'DOS-001' }];
    const inMock = jest.fn().mockReturnThis();

    const mockQuery: any = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      in: inMock,
      range: jest.fn().mockReturnThis(),
      then: (resolve: any) => resolve({ data: mockData, error: null, count: 1 }),
    };

    supabase.getClient.mockReturnValue({
      from: jest.fn().mockReturnValue(mockQuery),
    });

    const result = await useCase.execute('org-client');

    expect(inMock).toHaveBeenCalledWith('id', ['d-1']);
    expect(result.items).toHaveLength(1);
  });
});
