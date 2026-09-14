import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { hashToken } from '@common/utils/token-hash.util';

describe('AuthService.refreshToken', () => {
  let service: AuthService;
  let supabaseClient: {
    from: jest.Mock;
  };

  const userId = '11111111-1111-1111-1111-111111111111';
  const refreshToken = 'refresh.jwt.token';

  beforeEach(() => {
    const tokenRow = {
      id: 'token-1',
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      revoked: false,
    };

    const refreshQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: tokenRow, error: null }),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null }),
      single: jest.fn(),
    };

    const usersQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: userId,
          full_name: 'Admin',
          email: 'admin@test.com',
          organization_id: 'org-1',
          status: 'active',
        },
        error: null,
      }),
    };

    supabaseClient = {
      from: jest.fn((table: string) => {
        if (table === 'refresh_tokens') return refreshQuery;
        if (table === 'users') return usersQuery;
        return refreshQuery;
      }),
    };

    const supabase = { getClient: () => supabaseClient };
    const jwt = {
      sign: jest.fn().mockReturnValue('new.token'),
    };
    const config = {
      get: jest.fn((key: string, fallback?: string) => {
        if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        return fallback;
      }),
    };

    const audit = { log: jest.fn().mockResolvedValue(undefined) };

    service = new AuthService(
      supabase as any,
      jwt as any,
      config as any,
      {} as any,
      {} as any,
      audit as any,
    );
  });

  it('looks up refresh token by SHA-256 hash (O(1))', async () => {
    const result = await service.refreshToken(userId, refreshToken);

    expect(result.access_token).toBe('new.token');
    expect(result.refresh_token).toBe('new.token');

    const refreshCalls = supabaseClient.from.mock.calls.filter(([t]) => t === 'refresh_tokens');
    expect(refreshCalls.length).toBeGreaterThan(0);

    // El hash usado en la búsqueda debe coincidir con hashToken(token)
    const expectedHash = hashToken(refreshToken);
    const eqCalls = (supabaseClient.from('refresh_tokens').eq as jest.Mock).mock.calls;
    expect(eqCalls.some((args) => args[0] === 'token_hash' && args[1] === expectedHash)).toBe(
      true,
    );
  });

  it('rejects invalid refresh tokens', async () => {
    supabaseClient.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    await expect(service.refreshToken(userId, 'bad')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
