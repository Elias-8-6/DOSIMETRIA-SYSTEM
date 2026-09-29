import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '@common/interfaces/jwt-payload.interface';
import { SupabaseService } from '@config/supabase.config';
import { ACCESS_COOKIE } from '@common/utils/cookie.util';

/**
 * Caché en memoria del status del usuario.
 * Evita consultar Supabase en cada request autenticada (que ocurre varias veces
 * por segundo en páginas con múltiples llamadas a la API). El TTL de 30 segundos
 * es un equilibrio entre rendimiento y detectar desactivaciones de cuenta.
 */
interface StatusCacheEntry {
  active: boolean;
  expiresAt: number;
}
const USER_STATUS_CACHE = new Map<string, StatusCacheEntry>();
const STATUS_CACHE_TTL_MS = 30_000; // 30 segundos

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

    // Verificar caché antes de ir a la DB.
    const cached = USER_STATUS_CACHE.get(payload.sub);
    if (cached && Date.now() < cached.expiresAt) {
      if (!cached.active) {
        throw new UnauthorizedException('Usuario inactivo o no encontrado');
      }
      return payload;
    }

    // Caché expirada o ausente: consultar la DB.
    const { data: user } = await this.supabase
      .getClient()
      .from('users')
      .select('id, status')
      .eq('id', payload.sub)
      .maybeSingle();

    const isActive = !!user && user.status === 'active';

    // Guardar en caché.
    USER_STATUS_CACHE.set(payload.sub, {
      active: isActive,
      expiresAt: Date.now() + STATUS_CACHE_TTL_MS,
    });

    if (!isActive) {
      throw new UnauthorizedException('Usuario inactivo o no encontrado');
    }

    return payload;
  }
}

