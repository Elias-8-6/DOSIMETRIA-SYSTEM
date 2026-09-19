import { IsDateString, IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Acepta digitos, +, espacios, guiones y parentesis; neto 7-15 digitos. */
const PHONE_REGEX = /^\+?[\d\s\-(). ]{7,20}$/;

export class UpdateClientDto {
  @IsString()
  @IsOptional()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(120, { message: 'El nombre no puede superar 120 caracteres' })
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'El nombre de contacto no puede superar 100 caracteres' })
  contact_name?: string;

  @IsEmail({}, { message: 'El email de contacto no es válido' })
  @IsOptional()
  contact_email?: string;

  @IsString()
  @IsOptional()
  @Matches(PHONE_REGEX, { message: 'El teléfono debe tener entre 7 y 15 dígitos (puede incluir +, guiones y espacios)' })
  @MaxLength(20, { message: 'El teléfono no puede superar 20 caracteres' })
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsIn(['hospital', 'clinica', 'industria', 'investigacion', 'gobierno', 'otro'], {
    message: 'Tipo de cliente no válido',
  })
  @IsOptional()
  client_type?: string;

  @IsDateString({}, { message: 'La fecha de inicio de contrato debe ser YYYY-MM-DD' })
  @IsOptional()
  contract_start_date?: string;

  @IsDateString({}, { message: 'La fecha de fin de contrato debe ser YYYY-MM-DD' })
  @IsOptional()
  contract_end_date?: string;
}

