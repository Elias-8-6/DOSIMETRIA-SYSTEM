/**
 * Detecta si un error de Supabase/PostgreSQL/PostgREST corresponde
 * exclusivamente a la ausencia física o de caché de la columna 'barcode'
 * (ej. migración 013 aún no ejecutada o PostgREST schema cache desactualizado).
 * 
 * Regla de seguridad: NUNCA debe coincidir con violaciones de unicidad (23505).
 */
export function isMissingBarcodeColumnError(error: any): boolean {
  if (!error) return false;

  // 23505 = unique_violation (colisión de serial_number o barcode). Jamás debe tratarse como columna ausente.
  if (error.code === '23505') {
    return false;
  }

  // 42703 = undefined_column en PostgreSQL
  if (error.code === '42703') {
    return true;
  }

  // PGRST204 = PostgREST schema cache no encuentra la columna
  if (error.code === 'PGRST204') {
    return true;
  }

  const msg = String(error.message || '').toLowerCase();
  const mentionsBarcode = msg.includes('barcode');
  const mentionsColumn = msg.includes('column') || msg.includes('columna') || msg.includes('attribute');
  const mentionsNotExist =
    msg.includes('does not exist') ||
    msg.includes('not found') ||
    msg.includes('could not find') ||
    msg.includes('no existe');

  return mentionsBarcode && (mentionsColumn || mentionsNotExist);
}
