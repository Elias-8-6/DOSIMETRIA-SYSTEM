import { sanitizeSearchTerm } from './search.util';

describe('sanitizeSearchTerm', () => {
  it('returns undefined for empty input', () => {
    expect(sanitizeSearchTerm(undefined)).toBeUndefined();
    expect(sanitizeSearchTerm('')).toBeUndefined();
    expect(sanitizeSearchTerm('   ')).toBeUndefined();
  });

  it('strips PostgREST filter metacharacters', () => {
    expect(sanitizeSearchTerm('foo,bar.baz(qux)%')).toBe('foo bar baz qux');
  });

  it('limits length', () => {
    const long = 'a'.repeat(200);
    expect(sanitizeSearchTerm(long)?.length).toBe(100);
  });

  it('keeps normal search terms', () => {
    expect(sanitizeSearchTerm('Hospital Central')).toBe('Hospital Central');
  });
});
