import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UpdateHolderUseCase } from './update-holder.use-case';

describe('UpdateHolderUseCase', () => {
  let supabase: { getClient: jest.Mock };
  let audit: { log: jest.Mock };
  let useCase: UpdateHolderUseCase;

  beforeEach(() => {
    supabase = { getClient: jest.fn() };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    useCase = new UpdateHolderUseCase(supabase as any, audit as any);
  });

  it('throws NotFoundException when holder does not exist', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      })),
    });

    await expect(useCase.execute('h-missing', { notes: 'test' }, 'u-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates condition and logs audit correctly', async () => {
    const existing = {
      id: 'h-1',
      barcode: 'HLD-01',
      serial_number: 'HLD-01',
      current_condition: 'integro',
      status: 'disponible',
    };
    const updated = {
      ...existing,
      current_condition: 'danado_leve',
      notes: 'Pinza floja',
    };

    supabase.getClient.mockReturnValue({
      from: jest.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: existing, error: null }),
          }),
        }),
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: updated, error: null }),
            }),
          }),
        }),
      })),
    });

    const res = await useCase.execute(
      'h-1',
      { current_condition: 'danado_leve', notes: 'Pinza floja' },
      'u-1',
    );
    expect(res.current_condition).toBe('danado_leve');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        entityId: 'h-1',
      }),
    );
  });

  it('returns existing holder without error or update call when payload is empty', async () => {
    const existing = {
      id: 'h-1',
      barcode: 'HLD-01',
      serial_number: 'SN-01',
      status: 'disponible',
    };
    const updateFn = jest.fn();

    supabase.getClient.mockReturnValue({
      from: jest.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: existing, error: null }),
          }),
        }),
        update: updateFn,
      })),
    });

    const res = await useCase.execute('h-1', {}, 'u-1');
    expect(res).toEqual(existing);
    expect(updateFn).not.toHaveBeenCalled();
  });

  it('rejects status change when holder is en_campo', async () => {
    const existing = {
      id: 'h-1',
      barcode: 'HLD-01',
      serial_number: 'SN-01',
      status: 'en_campo',
    };

    supabase.getClient.mockReturnValue({
      from: jest.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: existing, error: null }),
          }),
        }),
      })),
    });

    await expect(
      useCase.execute('h-1', { status: 'disponible' }, 'u-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects setting status to baja when holder has active assembly', async () => {
    const existing = {
      id: 'h-1',
      barcode: 'HLD-01',
      serial_number: 'SN-01',
      status: 'ensamblado',
    };

    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'holder_dosimeters') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: existing, error: null }),
              }),
            }),
          };
        }
        if (table === 'dosimeter_assignments') {
          return {
            select: () => ({
              eq: () => ({
                is: () => ({
                  maybeSingle: () => Promise.resolve({ data: null, error: null }),
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
                  maybeSingle: () => Promise.resolve({ data: { id: 'asm-1' }, error: null }),
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    await expect(
      useCase.execute('h-1', { status: 'baja' }, 'u-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
