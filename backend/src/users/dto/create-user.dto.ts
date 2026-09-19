import { IsDateString, IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { IsStrongAppPassword } from '@common/utils/password.util';

/** Acepta digitos, +, espacios, guiones y parentesis; neto 7-15 digitos. */
const PHONE_REGEX = /^\+?[\d\s\-(). ]{7,20}$/;

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre completo es requerido' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede superar 100 caracteres' })
  full_name!: string;

  @IsEmail({}, { message: 'El email no es válido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  email!: string;

  @IsStrongAppPassword()
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'El rol es requerido' })
  role_code!: string;

  @IsString()
  @IsOptional()
  degree_title?: string;

  @IsString()
  @IsOptional()
  university?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsNotEmpty({ message: 'La Cédula/DNI es un campo requerido' })
  @MinLength(5, { message: 'La cédula/DNI debe tener al menos 5 caracteres' })
  @MaxLength(20, { message: 'La cédula/DNI no puede superar 20 caracteres' })
  document_number?: string;

  @IsString()
  @IsNotEmpty({ message: 'El teléfono es un campo requerido' })
  @Matches(PHONE_REGEX, { message: 'El teléfono debe tener entre 7 y 15 dígitos (puede incluir +, guiones y espacios)' })
  @MaxLength(20, { message: 'El teléfono no puede superar 20 caracteres' })
  phone?: string;

  @IsDateString({}, { message: 'La fecha de nacimiento debe ser una fecha válida (YYYY-MM-DD)' })
  @IsOptional()
  date_of_birth?: string;

  @IsDateString({}, { message: 'La fecha de contratación debe ser una fecha válida (YYYY-MM-DD)' })
  @IsOptional()
  hire_date?: string;
}

