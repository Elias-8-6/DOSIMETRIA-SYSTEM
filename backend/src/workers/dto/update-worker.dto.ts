import { IsDateString, IsEmail, IsOptional, IsString, Matches } from 'class-validator';
import { UUID_REGEX } from './query-workers.dto';

export class UpdateWorkerDto {
  @IsOptional()
  @IsString({ message: 'El nombre debe ser palabras' })
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
  document_number?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsString()
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
