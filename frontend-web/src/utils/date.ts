/** Formatea una fecha (ISO o YYYY-MM-DD) de forma consistente en toda la app. Devuelve '—' si no hay valor o es inválida. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-PA');
}
