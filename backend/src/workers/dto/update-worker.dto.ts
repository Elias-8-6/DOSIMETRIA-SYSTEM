import { IsDateString, IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { UUID_REGEX } from './query-workers.dto';

/** Acepta digitos, +, espacios, guiones y parentesis; neto 7-15 digitos. */
const PHONE_REGEX = /^\+?[\d\s\-(). ]{7,20}$/;

export class UpdateWorkerDto {
  @IsOptional()
  @IsString({ message: 'El nombre debe ser palabras' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede superar 100 caracteres' })
  full_name?: string;

  @IsOptional()
  @Matches(UUID_REGEX, { message: 'client_id must be a UUID' })
  client_id?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo no cumple con el formato requerido' })
  email?: string;

  @IsOptional()
  @Matches(UUID_REGEX, { message: 'client_location_id must be a UUID' })
  client_location_id?: string;

  @IsOptional()
  @IsString()
  @MinLength(5, { message: 'La cédula/DNI debe tener al menos 5 caracteres' })
  @MaxLength(20, { message: 'La cédula/DNI no puede superar 20 caracteres' })
  document_number?: string;

  @IsOptional()
  @IsString()
  @Matches(PHONE_REGEX, { message: 'El teléfono debe tener entre 7 y 15 dígitos (puede incluir +, guiones y espacios)' })
  @MaxLength(20, { message: 'El teléfono no puede superar 20 caracteres' })
  phone?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'El código de empleado no puede superar 20 caracteres' })
  employee_code?: string;

  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'La ocupación no puede superar 100 caracteres' })
  occupation?: string;
}
