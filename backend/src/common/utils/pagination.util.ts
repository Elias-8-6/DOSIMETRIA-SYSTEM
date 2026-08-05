const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export function normalizePagination(
  page?: number | string,
  limit?: number | string,
): { page: number; limit: number; from: number; to: number } {
  const parsedPage = Math.max(1, Number(page) || DEFAULT_PAGE);
  const parsedLimit = Math.min(MAX_LIMIT, Math.max(1, Number(limit) || DEFAULT_LIMIT));
  const from = (parsedPage - 1) * parsedLimit;
  const to = from + parsedLimit - 1;

  return { page: parsedPage, limit: parsedLimit, from, to };
}
