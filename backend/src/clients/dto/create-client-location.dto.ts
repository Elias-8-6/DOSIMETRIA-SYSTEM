import { IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Acepta digitos, +, espacios, guiones y parentesis; neto 7-15 digitos. */
const PHONE_REGEX = /^\+?[\d\s\-(). ]{7,20}$/;

export class CreateClientLocationDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la sede es requerido' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede superar 100 caracteres' })
  name!: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  @Matches(PHONE_REGEX, { message: 'El teléfono debe tener entre 7 y 15 dígitos (puede incluir +, guiones y espacios)' })
  @MaxLength(20, { message: 'El teléfono no puede superar 20 caracteres' })
  phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'El nombre de contacto no puede superar 100 caracteres' })
  contact_name?: string;

  @IsIn(['rayos_x', 'gamma', 'neutrones', 'beta', 'mixta', 'otro'], {
    message: 'Tipo de radiación no válido',
  })
  @IsOptional()
  radiation_type?: string;

  @IsIn(['bajo', 'medio', 'alto'], { message: 'Nivel de riesgo no válido' })
  @IsOptional()
  risk_level?: string;
}
