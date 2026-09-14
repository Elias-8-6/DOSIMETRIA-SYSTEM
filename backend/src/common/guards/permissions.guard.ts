import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CHECK_PERMISSION_KEY, RequiredPermission } from '../decorators/check-permission.decorator';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { SupabaseService } from '@config/supabase.config';
import { PermissionsCacheService } from '../services/permissions-cache.service';

/**
 * PermissionsGuard — verifica permiso granular con cache en memoria (TTL 60s).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabase: SupabaseService,
    private readonly permissionsCache: PermissionsCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<RequiredPermission>(CHECK_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user?.sub) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    const permissionCode = `${required.module}:${required.action}`;

    const cached = this.permissionsCache.hasPermission(user.sub, permissionCode);
    if (cached === true) return true;
    if (cached === false) {
      throw new ForbiddenException(`No tenés permiso para '${permissionCode}'`);
    }

    const permissions = await this.loadPermissions(user.sub);
    this.permissionsCache.set(user.sub, permissions);

    if (!permissions.has(permissionCode)) {
      throw new ForbiddenException(`No tenés permiso para '${permissionCode}'`);
    }

    return true;
  }

  private async loadPermissions(userId: string): Promise<Set<string>> {
    const { data, error } = await this.supabase
      .getClient()
      .from('user_permissions')
      .select('permissions!inner(code)')
      .eq('user_id', userId)
      .eq('granted', true);

    if (error) {
      throw new ForbiddenException('Error al verificar permisos');
    }

    const codes = new Set<string>();
    for (const row of data ?? []) {
      const permission = row.permissions as unknown as { code: string } | { code: string }[];
      if (Array.isArray(permission)) {
        permission.forEach((p) => codes.add(p.code));
      } else if (permission?.code) {
        codes.add(permission.code);
      }
    }
    return codes;
  }
}
