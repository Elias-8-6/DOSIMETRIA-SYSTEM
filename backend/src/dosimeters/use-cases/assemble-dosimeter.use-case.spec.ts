import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AssembleDosimeterUseCase } from './assemble-dosimeter.use-case';

describe('AssembleDosimeterUseCase', () => {
  let supabase: { getClient: jest.Mock };
  let audit: { log: jest.Mock };
  let useCase: AssembleDosimeterUseCase;

  beforeEach(() => {
    supabase = { getClient: jest.fn() };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    useCase = new AssembleDosimeterUseCase(supabase as any, audit as any);
  });

  it('rejects if neither dosimeter_id nor tld_card_id is provided', async () => {
    await expect(useCase.execute({ holder_id: 'holder-1' } as any, 'user-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws NotFoundException when holder does not exist', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'holder_dosimeters') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    await expect(
      useCase.execute({ holder_id: 'holder-missing', dosimeter_id: 'dos-1' } as any, 'user-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects when holder is not in disponible status', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'holder_dosimeters') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({
                  data: { id: 'holder-1', barcode: 'BAR-001', status: 'en_campo', current_condition: 'integro' },
                  error: null,
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    await expect(
      useCase.execute({ holder_id: 'holder-1', dosimeter_id: 'dos-1' } as any, 'user-1'),
    ).rejects.toThrow(ConflictException);
  });

  it('successfully assembles a holder and a dosimeter', async () => {
    const holderUpdate = jest.fn().mockReturnValue({ eq: () => Promise.resolve({ error: null }) });
    const assemblyInsert = jest.fn().mockReturnValue({
      select: () => ({
        single: () => Promise.resolve({
          data: { id: 'assembly-1', holder_id: 'holder-1', dosimeter_id: 'dos-1', assembled_at: '2026-11-23T18:00:00Z' },
          error: null,
        }),
      }),
    });

    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'holder_dosimeters') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({
                  data: { id: 'holder-1', barcode: 'BAR-001', serial_number: 'HOLD-001', status: 'disponible', current_condition: 'integro' },
                  error: null,
                }),
              }),
            }),
            update: holderUpdate,
          };
        }
        if (table === 'dosimeters') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({
                  data: { id: 'dos-1', serial_number: 'DOS-001', current_condition: 'normal', status_id: 'stat-disp', dosimeter_statuses: { code: 'DISPONIBLE' } },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'holder_tld_assemblies') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: null, error: null }),
                }),
              }),
            }),
            insert: assemblyInsert,
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    const result = await useCase.execute(
      { holder_id: 'holder-1', dosimeter_id: 'dos-1', notes: 'Prueba ensamble' } as any,
      'user-1',
    );

    expect(result.assembly_id).toBe('assembly-1');
    expect(result.holder.barcode).toBe('BAR-001');
    expect(result.dosimeter?.serial_number).toBe('DOS-001');
    expect(holderUpdate).toHaveBeenCalledWith({ status: 'ensamblado' });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', entityName: 'holder_tld_assemblies' }),
    );
  });
});
