import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DeleteHolderUseCase } from './delete-holder.use-case';

describe('DeleteHolderUseCase', () => {
  let supabase: { getClient: jest.Mock };
  let audit: { log: jest.Mock };
  let useCase: DeleteHolderUseCase;

  beforeEach(() => {
    supabase = { getClient: jest.fn() };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    useCase = new DeleteHolderUseCase(supabase as any, audit as any);
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

    await expect(useCase.execute('h-missing', 'u-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects deletion when holder is in an active assembly', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'holder_dosimeters') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: { id: 'h-1', barcode: 'HLD-01', status: 'ensamblado' },
                    error: null,
                  }),
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
                  maybeSingle: () =>
                    Promise.resolve({ data: { id: 'asm-active' }, error: null }),
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    await expect(useCase.execute('h-1', 'u-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects deletion when holder is in en_campo status', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'holder_dosimeters') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: { id: 'h-1', barcode: 'HLD-01', status: 'en_campo' },
                    error: null,
                  }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    await expect(useCase.execute('h-1', 'u-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects deletion when holder has open assignment', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'holder_dosimeters') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: { id: 'h-1', barcode: 'HLD-01', status: 'disponible' },
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (table === 'dosimeter_assignments') {
          return {
            select: () => ({
              eq: () => ({
                is: () => ({
                  maybeSingle: () =>
                    Promise.resolve({ data: { id: 'asg-open' }, error: null }),
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    await expect(useCase.execute('h-1', 'u-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('successfully sets status to baja when no active assembly exists', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'holder_dosimeters') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: { id: 'h-1', barcode: 'HLD-01', status: 'disponible' },
                    error: null,
                  }),
              }),
            }),
            update: () => ({
              eq: () => ({
                select: () => ({
                  single: () =>
                    Promise.resolve({
                      data: { id: 'h-1', barcode: 'HLD-01', status: 'baja' },
                      error: null,
                    }),
                }),
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
                  maybeSingle: () => Promise.resolve({ data: null, error: null }),
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    const res = await useCase.execute('h-1', 'u-1');
    expect(res.holder.status).toBe('baja');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DELETE',
        newValues: { status: 'baja' },
      }),
    );
  });
});
