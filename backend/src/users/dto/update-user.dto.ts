import { IsDateString, IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
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
  document_number?: string;

  @IsString()
  @IsOptional()
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
