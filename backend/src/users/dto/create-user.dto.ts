import { IsDateString, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsStrongAppPassword } from '@common/utils/password.util';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre completo es requerido' })
  full_name!: string;

  @IsEmail({}, { message: 'El email no es válido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  email!: string;

  @IsStrongAppPassword()
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'El rol es requerido' })
  role_code!: string;

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
  @IsNotEmpty({ message: 'La Cédula/DNI es un campo requerido' })
  document_number?: string;

  @IsString()
  @IsNotEmpty({ message: 'El teléfono es un campo requerido' })
  phone?: string;

  @IsDateString({}, { message: 'La fecha de nacimiento debe ser una fecha válida (YYYY-MM-DD)' })
  @IsOptional()
  date_of_birth?: string;

  @IsDateString({}, { message: 'La fecha de contratación debe ser una fecha válida (YYYY-MM-DD)' })
  @IsOptional()
  hire_date?: string;
}
