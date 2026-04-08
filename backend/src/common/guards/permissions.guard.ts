import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  CHECK_PERMISSION_KEY,
  RequiredPermission,
} from '../decorators/check-permission.decorator';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { SupabaseService } from '@config/supabase.config';

/**
 * PermissionsGuard — verifica que el usuario tenga el permiso
 * granular requerido para acceder al endpoint.
 *
 * Siempre se usa junto a JwtGuard:
 *   @UseGuards(JwtGuard, PermissionsGuard)
 *   @CheckPermission('dosimeters', 'create')
 *   @Post()
 *   create() { ... }
 *
 * Flujo de verificación:
 * 1. Lee el permiso requerido del decorador @CheckPermission()
 * 2. Extrae el user_id del JWT (puesto por JwtGuard)
 * 3. Consulta user_permissions en Supabase
 * 4. Si granted = true → permite el acceso
 * 5. Si no existe o granted = false → lanza 403
 *
 * La consulta usa el índice idx_user_permissions_lookup
 * definido en la migración 010 para máxima performance.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabase: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Leer el permiso requerido del decorador
    const required = this.reflector.getAllAndOverride<RequiredPermission>(
      CHECK_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si el endpoint no tiene @CheckPermission(), acceso libre
    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user?.sub) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    // Construir el código del permiso: 'modulo:accion'
    const permissionCode = `${required.module}:${required.action}`;

    // Consultar si el usuario tiene el permiso con granted = true
    const { data, error } = await this.supabase
      .getClient()
      .from('user_permissions')
      .select('granted, permissions!inner(code)')
      .eq('user_id', user.sub)
      .eq('granted', true)
      .eq('permissions.code', permissionCode)
      .maybeSingle();

    if (error) {
      // Error de base de datos — no asumimos acceso, fallamos seguro
      throw new ForbiddenException('Error al verificar permisos');
    }

    if (!data) {
      throw new ForbiddenException(
        `No tenés permiso para '${permissionCode}'`,
      );
    }

    return true;
  }
}
