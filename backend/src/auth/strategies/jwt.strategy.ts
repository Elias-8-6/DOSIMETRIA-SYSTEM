import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '@common/interfaces/jwt-payload.interface';

/**
 * JwtStrategy — valida el token JWT en cada request protegido.
 *
 * Extrae el token del header: Authorization: Bearer <token>
 * Si el token es válido, adjunta el payload a request.user.
 * Si es inválido o expirado, retorna 401.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest:   ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:      config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * validate() se llama automáticamente después de verificar la firma.
   * Lo que retorna aquí se adjunta a request.user.
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.sub || !payload.organization_id || !payload.active_role) {
      throw new UnauthorizedException('Token inválido — payload incompleto');
    }
    return payload;
  }
}
