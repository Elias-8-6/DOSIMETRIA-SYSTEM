import { IsDateString, IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  full_name?: string;

  @IsEmail({}, { message: 'El email no es válido' })
  @IsOptional()
  email?: string;

  // Migración 012
  @IsString()
  @IsOptional()
  degree_title?: string;

  @IsString()
  @IsOptional()
  university?: string;

  @IsString()
  @IsOptional()
  location?: string;

  // Migración 013
  @IsString()
  @IsOptional()
  document_number?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsDateString({}, { message: 'La fecha de nacimiento debe ser YYYY-MM-DD' })
  @IsOptional()
  date_of_birth?: string;
}
