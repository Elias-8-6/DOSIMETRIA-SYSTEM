import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload, Role } from '../interfaces/jwt-payload.interface';
import { SupabaseService } from '@config/supabase.config';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabase: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<(Role | string)[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user?.sub) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    // Consultar roles asignados al usuario en la BD
    const { data: userRoles, error } = await this.supabase
      .getClient()
      .from('user_roles')
      .select('roles!inner(code)')
      .eq('user_id', user.sub);

    if (error || !userRoles) {
      throw new ForbiddenException('Error al verificar roles de usuario');
    }

    const assignedRoleCodes = userRoles.map((ur: any) => ur.roles?.code);

    const hasRequiredRole = requiredRoles.some((role) =>
      assignedRoleCodes.includes(role as string),
    );

    if (!hasRequiredRole) {
      throw new ForbiddenException(
        `Acceso denegado: se requiere uno de los siguientes roles [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}
