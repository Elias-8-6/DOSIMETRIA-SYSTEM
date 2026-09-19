/**
 * Funciones de validacion reutilizables para los formularios del sistema.
 * Todas retornan `true` si el valor es valido.
 */

/**
 * Valida formato de telefono: acepta digitos, +, espacios, guiones y parentesis.
 * Longitud neta de digitos: entre 7 y 15.
 */
export function isValidPhone(value: string): boolean {
  if (!value) return false;
  const digits = value.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return false;
  return /^\+?[\d\s\-(). ]{7,20}$/.test(value);
}

/**
 * Filtra caracteres no permitidos en un teléfono mientras se escribe.
 * Solo permite dígitos, '+', espacios, '-', '(', ')' y '.',
 * limitando el número total de dígitos a un máximo de 15 y el texto a 20 caracteres.
 */
export function sanitizePhoneInput(value: string): string {
  if (!value) return '';
  let cleaned = value.replace(/[^0-9+\s\-().]/g, '');
  if (cleaned.includes('+')) {
    cleaned = (cleaned.startsWith('+') ? '+' : '') + cleaned.replace(/\+/g, '');
  }
  let digitCount = 0;
  let result = '';
  for (const char of cleaned) {
    if (/\d/.test(char)) {
      if (digitCount < 15) {
        result += char;
        digitCount++;
      }
    } else {
      result += char;
    }
  }
  return result.slice(0, 20);
}

/**
 * Valida que una URL comience con http:// o https://.
 */
export function isValidUrl(value: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Valida que una fecha (YYYY-MM-DD) no sea futura (<= hoy).
 * Si el valor esta vacio, retorna true (campo opcional).
 */
export function isDateNotFuture(value: string): boolean {
  if (!value) return true;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return new Date(value) <= today;
}

/**
 * Valida que dateA sea posterior o igual a dateB.
 * Si falta alguno, retorna true (no hay conflicto).
 */
export function isDateAfterOrEqual(dateA: string, dateB: string): boolean {
  if (!dateA || !dateB) return true;
  return new Date(dateA) >= new Date(dateB);
}

/**
 * Valida que una persona tenga al menos minYears anos.
 * Usado para fecha de nacimiento de usuarios del sistema (minimo 18 anos).
 */
export function hasMinimumAge(dateOfBirth: string, minYears: number): boolean {
  if (!dateOfBirth) return true;
  const dob = new Date(dateOfBirth);
  const today = new Date();
  const age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  const dayDiff = today.getDate() - dob.getDate();
  const actualAge =
    monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
  return actualAge >= minYears;
}
