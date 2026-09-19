import { IsDateString, IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Acepta digitos, +, espacios, guiones y parentesis; neto 7-15 digitos. */
const PHONE_REGEX = /^\+?[\d\s\-(). ]{7,20}$/;

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede superar 100 caracteres' })
  full_name?: string;

  @IsEmail({}, { message: 'El email no es válido' })
  @IsOptional()
  email?: string;

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
  @IsOptional()
  @MinLength(5, { message: 'La cédula/DNI debe tener al menos 5 caracteres' })
  @MaxLength(20, { message: 'La cédula/DNI no puede superar 20 caracteres' })
  document_number?: string;

  @IsString()
  @IsOptional()
  @Matches(PHONE_REGEX, { message: 'El teléfono debe tener entre 7 y 15 dígitos (puede incluir +, guiones y espacios)' })
  @MaxLength(20, { message: 'El teléfono no puede superar 20 caracteres' })
  phone?: string;

  @IsDateString({}, { message: 'La fecha de nacimiento debe ser una fecha válida (YYYY-MM-DD)' })
  @IsOptional()
  date_of_birth?: string;

  @IsDateString({}, { message: 'La fecha de contratación debe ser una fecha válida (YYYY-MM-DD)' })
  @IsOptional()
  hire_date?: string;

  @IsString()
  @IsOptional()
  role_code?: string;
}

