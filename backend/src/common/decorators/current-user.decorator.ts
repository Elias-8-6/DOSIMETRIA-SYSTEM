import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '@common/interfaces/jwt-payload.interface';

/**
 * Decorador @CurrentUser() — extrae el usuario autenticado del request o una propiedad específica.
 * Disponible después de que JwtGuard valida el token.
 *
 * Uso:
 *   @Get('profile')
 *   getProfile(@CurrentUser() user: JwtPayload) { ... }
 *   getReports(@CurrentUser('organization_id') orgId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
