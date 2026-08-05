import { PermissionsCacheService } from './permissions-cache.service';

describe('PermissionsCacheService', () => {
  let cache: PermissionsCacheService;

  beforeEach(() => {
    cache = new PermissionsCacheService();
  });

  it('stores and reads permissions', () => {
    cache.set('user-1', new Set(['users:read', 'clients:read']));
    expect(cache.hasPermission('user-1', 'users:read')).toBe(true);
    expect(cache.hasPermission('user-1', 'users:create')).toBe(false);
  });

  it('returns null on cache miss', () => {
    expect(cache.hasPermission('missing', 'users:read')).toBeNull();
  });

  it('invalidates a user entry', () => {
    cache.set('user-1', new Set(['users:read']));
    cache.invalidate('user-1');
    expect(cache.hasPermission('user-1', 'users:read')).toBeNull();
  });
});
