import { Matches, MinLength, IsString, IsNotEmpty } from 'class-validator';
import { applyDecorators } from '@nestjs/common';

/**
 * Cost factor de bcrypt para hashear contraseñas. 12 es el mínimo
 * recomendado para 2025+ con bcryptjs (implementación JS pura, sin
 * aceleración nativa).
 */
export const BCRYPT_COST_FACTOR = 12;

/**
 * Política de contraseñas: mínimo 12 caracteres, mayúscula, minúscula,
 * número y símbolo.
 */
export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

export const PASSWORD_MESSAGE =
  'La contraseña debe tener al menos 12 caracteres, incluyendo mayúscula, minúscula, número y símbolo';

export function IsStrongAppPassword() {
  return applyDecorators(
    IsString(),
    IsNotEmpty({ message: 'La contraseña es requerida' }),
    MinLength(12, { message: 'La contraseña debe tener al menos 12 caracteres' }),
    Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE }),
  );
}
