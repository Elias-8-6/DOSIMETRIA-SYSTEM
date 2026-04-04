import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '@common/decorators/roles.decorator';
import { Role, JwtPayload } from '@common/interfaces/jwt-payload.interface';

/**
 * RolesGuard — verifica que el rol activo del usuario tenga
 * permisos para acceder al endpoint.
 *
 * Siempre se usa junto a JwtGuard:
 *   @UseGuards(JwtGuard, RolesGuard)
 *   @Roles(Role.ADMIN_LAB)
 *   @Post('clients')
 *   create() { ... }
 *
 * ISO 17025: el active_role queda registrado en audit_logs
 * por el AuditLogInterceptor en cada acción.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si el endpoint no tiene @Roles(), cualquier usuario autenticado puede acceder
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user || !user.active_role) {
      throw new ForbiddenException('No hay rol activo en la sesión');
    }

    const hasRole = requiredRoles.includes(user.active_role as Role);

    if (!hasRole) {
      throw new ForbiddenException(
        `El rol '${user.active_role}' no tiene permisos para esta acción`,
      );
    }

    return true;
  }
}
