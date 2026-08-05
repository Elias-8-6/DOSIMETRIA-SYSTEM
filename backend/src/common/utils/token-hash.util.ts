import { createHash } from 'crypto';

/** Hash determinista para lookup O(1) de refresh tokens. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
