import { Injectable } from '@nestjs/common';

interface CacheEntry {
  permissions: Set<string>;
  expiresAt: number;
}

const TTL_MS = 60_000;

/**
 * Cache en memoria de permisos por usuario (TTL 60s).
 * Se invalida al asignar/revocar permisos.
 */
@Injectable()
export class PermissionsCacheService {
  private readonly cache = new Map<string, CacheEntry>();

  get(userId: string): Set<string> | null {
    const entry = this.cache.get(userId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(userId);
      return null;
    }
    return entry.permissions;
  }

  set(userId: string, permissions: Set<string>): void {
    this.cache.set(userId, {
      permissions,
      expiresAt: Date.now() + TTL_MS,
    });
  }

  invalidate(userId: string): void {
    this.cache.delete(userId);
  }

  hasPermission(userId: string, permissionCode: string): boolean | null {
    const permissions = this.get(userId);
    if (!permissions) return null;
    return permissions.has(permissionCode);
  }
}
