import { normalizePagination } from './pagination.util';

describe('normalizePagination', () => {
  it('uses defaults', () => {
    expect(normalizePagination()).toEqual({ page: 1, limit: 10, from: 0, to: 9 });
  });

  it('caps limit at 100', () => {
    expect(normalizePagination(1, 1000).limit).toBe(100);
  });

  it('computes range for page 2', () => {
    expect(normalizePagination(2, 10)).toEqual({ page: 2, limit: 10, from: 10, to: 19 });
  });

  it('accepts string inputs', () => {
    expect(normalizePagination('3', '5')).toEqual({ page: 3, limit: 5, from: 10, to: 14 });
  });
});
