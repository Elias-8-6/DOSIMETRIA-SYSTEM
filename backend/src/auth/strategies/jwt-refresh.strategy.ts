import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '@common/interfaces/jwt-payload.interface';
import { REFRESH_COOKIE } from '@common/utils/cookie.util';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      passReqToCallback: true,
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.[REFRESH_COOKIE] ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    if (!payload.sub || !payload.organization_id) {
      throw new UnauthorizedException('Token inválido — payload incompleto');
    }

    const refreshToken =
      req.cookies?.[REFRESH_COOKIE] ??
      req.headers.authorization?.replace('Bearer ', '')?.trim();

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token no encontrado');
    }

    return { ...payload, refreshToken };
  }
}
