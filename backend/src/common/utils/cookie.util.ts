import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

export { ACCESS_COOKIE, REFRESH_COOKIE };

function cookieOptions(config: ConfigService, maxAgeMs: number) {
  const secure = config.get<string>('COOKIE_SECURE', 'false') === 'true';
  return {
    httpOnly: true,
    secure,
    sameSite: (secure ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
    maxAge: maxAgeMs,
  };
}

function parseDurationMs(value: string, fallbackMs: number): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return amount * (multipliers[unit] ?? fallbackMs);
}

export function setAuthCookies(
  res: Response,
  config: ConfigService,
  accessToken: string,
  refreshToken: string,
): void {
  const accessTtl = parseDurationMs(config.get('JWT_EXPIRES_IN', '15m'), 15 * 60_000);
  const refreshTtl = parseDurationMs(config.get('JWT_REFRESH_EXPIRES_IN', '7d'), 7 * 86_400_000);

  res.cookie(ACCESS_COOKIE, accessToken, cookieOptions(config, accessTtl));
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions(config, refreshTtl));
}

export function clearAuthCookies(res: Response, config: ConfigService): void {
  const secure = config.get<string>('COOKIE_SECURE', 'false') === 'true';
  const base = {
    httpOnly: true,
    secure,
    sameSite: (secure ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
  };
  res.clearCookie(ACCESS_COOKIE, base);
  res.clearCookie(REFRESH_COOKIE, base);
}
