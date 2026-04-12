import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * JwtGuard — protege endpoints con autenticación JWT.
 *
 * Uso en controlador:
 *   @UseGuards(JwtGuard)
 *   @Get('profile')
 *   getProfile() { ... }
 *
 * Si el token es inválido o está expirado, retorna 401 automáticamente.
 * Si el token es válido, adjunta el JwtPayload al request.user.
 */
@Injectable()
export class JwtGuard extends AuthGuard("jwt") {}
