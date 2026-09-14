import { hashToken } from './token-hash.util';

describe('hashToken', () => {
  it('is deterministic', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
  });

  it('differs for different tokens', () => {
    expect(hashToken('abc')).not.toBe(hashToken('xyz'));
  });

  it('returns a hex sha256 digest', () => {
    expect(hashToken('token')).toMatch(/^[a-f0-9]{64}$/);
  });
});
