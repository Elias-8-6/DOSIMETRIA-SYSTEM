import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '@common/interfaces/jwt-payload.interface';
import { SupabaseService } from '@config/supabase.config';
import { ACCESS_COOKIE } from '@common/utils/cookie.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly supabase: SupabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.[ACCESS_COOKIE] ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.sub || !payload.organization_id) {
      throw new UnauthorizedException('Token inválido — payload incompleto');
    }

    const { data: user } = await this.supabase
      .getClient()
      .from('users')
      .select('id, status')
      .eq('id', payload.sub)
      .maybeSingle();

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Usuario inactivo o no encontrado');
    }

    return payload;
  }
}
