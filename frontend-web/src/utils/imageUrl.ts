/**
 * Normaliza las URLs de imágenes para garantizar que sean accesibles desde el navegador.
 * En entornos de desarrollo donde el backend se comunica internamente con Supabase
 * usando 'host.docker.internal', esta función reemplaza el host por 'localhost' para
 * que el navegador del usuario en Windows pueda cargar la imagen sin errores de resolución DNS.
 */
export function formatImageUrl(url?: string | null): string {
  if (!url) return '';
  return url.replace('host.docker.internal', 'localhost');
}
