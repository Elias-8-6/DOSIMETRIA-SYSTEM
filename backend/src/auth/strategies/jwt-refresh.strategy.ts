import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '@common/interfaces/jwt-payload.interface';

/**
 * JwtStrategy — valida el token JWT en cada request protegido.
 *
 * Extrae el token del header: Authorization: Bearer <token>
 * Si el token es válido adjunta el payload a request.user.
 * Si es inválido o expirado retorna 401.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      passReqToCallback: true,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    // req es el primer parámetro porque passReqToCallback: true
    // payload es el segundo — el contenido decodificado del JWT

    if (!payload.sub || !payload.organization_id) {
      throw new UnauthorizedException('Token inválido — payload incompleto');
    }

    // Extraer el refresh token del header para pasarlo al servicio
    const refreshToken = req.headers.authorization?.replace('Bearer ', '')?.trim();

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token no encontrado');
    }

    // Todo lo que retornás aquí queda en request.user
    return { ...payload, refreshToken };
  }
}
