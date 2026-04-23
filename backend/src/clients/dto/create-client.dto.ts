import { IsDateString, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateClientDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del cliente es requerido' })
  name: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  contact_name?: string;

  @IsEmail({}, { message: 'El email de contacto no es válido' })
  @IsOptional()
  contact_email?: string;

  @IsString()
  @IsOptional()
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
