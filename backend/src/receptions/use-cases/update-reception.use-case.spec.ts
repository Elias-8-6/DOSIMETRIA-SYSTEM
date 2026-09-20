import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UpdateReceptionUseCase } from './update-reception.use-case';

describe('UpdateReceptionUseCase', () => {
  let supabase: { getClient: jest.Mock };
  let audit: { log: jest.Mock };
  let orgScope: { getOrganizationType: jest.Mock };
  let useCase: UpdateReceptionUseCase;

  beforeEach(() => {
    supabase = { getClient: jest.fn() };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    orgScope = {
      getOrganizationType: jest.fn().mockResolvedValue('laboratory'),
    };
    useCase = new UpdateReceptionUseCase(supabase as any, audit as any, orgScope as any);
  });

  it('throws ForbiddenException if client org tries to update reception', async () => {
    orgScope.getOrganizationType.mockResolvedValue('client');
    await expect(
      useCase.execute('rec-1', { observations: 'test' }, 'org-client', 'user-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws NotFoundException if reception does not exist', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })),
    });

    await expect(
      useCase.execute('rec-missing', { observations: 'test' }, 'org-lab', 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequestException if no fields provided to update', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 'rec-1', reception_code: 'REC-2026-00001' },
          error: null,
        }),
      })),
    });

    await expect(useCase.execute('rec-1', {}, 'org-lab', 'user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('updates reception and logs audit', async () => {
    supabase.getClient.mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            id: 'rec-1',
            reception_code: 'REC-2026-00001',
            packaging_condition: 'integro',
            observations: 'Inicial',
          },
          error: null,
        }),
        update: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'rec-1',
            reception_code: 'REC-2026-00001',
            packaging_condition: 'danado_leve',
            observations: 'Modificado',
          },
          error: null,
        }),
      })),
    });

    const result = await useCase.execute(
      'rec-1',
      { packaging_condition: 'danado_leve', observations: 'Modificado' },
      'org-lab',
      'user-1',
    );

    expect(result.packaging_condition).toBe('danado_leve');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        entityName: 'receptions',
      }),
    );
  });
});
