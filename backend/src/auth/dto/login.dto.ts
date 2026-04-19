import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

/**
 * DTO para login.
 * El usuario ingresa email + password.
 * NestJS verifica contra users.password_hash con bcrypt.
 */
export class LoginDto {
  @IsEmail({}, { message: "El email no tiene un formato válido" })
  email: string;

  @IsNotEmpty({ message: "La contraseña es requerida" })
  @MinLength(8, { message: "La contraseña debe tener al menos 8 caracteres" })
  password: string;
}
