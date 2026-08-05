import { NotFoundException } from '@nestjs/common';
import { OrganizationScopeService } from './organization-scope.service';

describe('OrganizationScopeService', () => {
  let supabase: { getClient: jest.Mock };
  let service: OrganizationScopeService;

  beforeEach(() => {
    supabase = { getClient: jest.fn() };
    service = new OrganizationScopeService(supabase as any);
  });

  describe('getOrganizationType', () => {
    it('returns the organization type', async () => {
      supabase.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: { type: 'laboratory' }, error: null }),
            }),
          }),
        }),
      });

      await expect(service.getOrganizationType('org-1')).resolves.toBe('laboratory');
    });

    it('throws NotFoundException when the organization does not exist', async () => {
      supabase.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      });

      await expect(service.getOrganizationType('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('getAllowedDosimeterIds', () => {
    it('dedupes dosimeter ids assigned to the client org', async () => {
      supabase.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ dosimeter_id: 'd-1' }, { dosimeter_id: 'd-1' }, { dosimeter_id: 'd-2' }],
              error: null,
            }),
          }),
        }),
      });

      const ids = await service.getAllowedDosimeterIds('org-1');
      expect(ids.sort()).toEqual(['d-1', 'd-2']);
    });

    it('returns an empty list when there are no assignments', async () => {
      supabase.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      await expect(service.getAllowedDosimeterIds('org-1')).resolves.toEqual([]);
    });
  });

  describe('isDosimeterAllowedForClientOrg', () => {
    it('returns true when an assignment links the dosimeter to the org', async () => {
      supabase.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'a-1' }, error: null }),
                }),
              }),
            }),
          }),
        }),
      });

      await expect(service.isDosimeterAllowedForClientOrg('d-1', 'org-1')).resolves.toBe(true);
    });

    it('returns false when no assignment links the dosimeter to the org', async () => {
      supabase.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          }),
        }),
      });

      await expect(service.isDosimeterAllowedForClientOrg('d-1', 'org-1')).resolves.toBe(false);
    });
  });
});
