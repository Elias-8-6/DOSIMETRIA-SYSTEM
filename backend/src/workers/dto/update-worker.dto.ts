import { IsDateString, IsEmail, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateWorkerDto {
  @IsOptional()
  @IsString({ message: 'El nombre debe ser palabras' })
  full_name?: string;

  @IsOptional()
  @IsUUID()
  client_id?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo no cumple con el formato requerido' })
  email?: string;

  @IsOptional()
  @IsUUID()
  client_location_id?: string;

  @IsOptional()
  @IsString()
  document_number?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsNumber()
  employee_code?: string;

  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  occupation?: string;
}
