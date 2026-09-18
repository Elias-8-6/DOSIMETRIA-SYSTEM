export function extractApiError(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string | string[] } } };
  const msg = e?.response?.data?.message ?? fallback;
  return Array.isArray(msg) ? msg.join(', ') : msg;
}

