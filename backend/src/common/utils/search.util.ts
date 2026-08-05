/**
 * Sanitiza términos de búsqueda para filtros PostgREST `.or()` / `ilike`.
 * Elimina caracteres que alteran la sintaxis del filtro.
 */
export function sanitizeSearchTerm(raw?: string, maxLength = 100): string | undefined {
  if (!raw) return undefined;

  const cleaned = raw
    .replace(/[,.()%\\]/g, ' ')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

  return cleaned.length > 0 ? cleaned : undefined;
}
