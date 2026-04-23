import { IsDateString, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre completo es requerido' })
  full_name: string;

  @IsEmail({}, { message: 'El email no es válido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'El rol es requerido' })
  role_code: string; // obligatorio — sin rol el usuario no puede hacer login

  // Campos de perfil extendido (migración 012)
  @IsString()
  @IsOptional()
  degree_title?: string;

  @IsString()
  @IsOptional()
  university?: string;

  @IsString()
  @IsOptional()
  location?: string;

  // Campos nuevos (migración 013)
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
}
