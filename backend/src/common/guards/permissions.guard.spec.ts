import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PermissionsCacheService } from '../services/permissions-cache.service';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;
  let cache: PermissionsCacheService;
  let supabase: { getClient: jest.Mock };

  const createContext = (user?: { sub: string }): ExecutionContext =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = new Reflector();
    cache = new PermissionsCacheService();
    supabase = {
      getClient: jest.fn(),
    };
    guard = new PermissionsGuard(reflector, supabase as any, cache);
  });

  it('allows access when no permission is required', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    await expect(guard.canActivate(createContext({ sub: 'u1' }))).resolves.toBe(true);
  });

  it('allows access from cache hit', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      module: 'users',
      action: 'read',
    });
    cache.set('u1', new Set(['users:read']));
    await expect(guard.canActivate(createContext({ sub: 'u1' }))).resolves.toBe(true);
  });

  it('denies access from cache miss of permission', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      module: 'users',
      action: 'create',
    });
    cache.set('u1', new Set(['users:read']));
    await expect(guard.canActivate(createContext({ sub: 'u1' }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('loads permissions from db on cache miss', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      module: 'clients',
      action: 'read',
    });

    const maybeChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    };
    maybeChain.eq.mockReturnValue(maybeChain);
    (maybeChain as any).then = undefined;

    supabase.getClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ permissions: { code: 'clients:read' } }],
              error: null,
            }),
          }),
        }),
      }),
    });

    await expect(guard.canActivate(createContext({ sub: 'u1' }))).resolves.toBe(true);
    expect(cache.hasPermission('u1', 'clients:read')).toBe(true);
  });
});
