import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { UUID_REGEX } from './query-workers.dto';

export class CreateWorkerDto {
  //campos requeridos
  @IsNotEmpty({ message: 'El nombre es un campo requerido' })
  @IsString({ message: 'El nombre debe ser palabras' })
  full_name!: string;

  @IsNotEmpty({ message: 'El cliente es un campo requerido para registrar trabajadores' })
  @Matches(UUID_REGEX, { message: 'client_id must be a UUID' })
  client_id!: string;

  @IsNotEmpty({ message: 'El email es un campo requerido' })
  @IsEmail({}, { message: 'El correo no cumple con el formato requerido' })
  email!: string;

  @IsNotEmpty({ message: 'La departamento en el que trabaja es un campo requerido' })
  @Matches(UUID_REGEX, { message: 'client_location_id must be a UUID' })
  client_location_id!: string;

  @IsNotEmpty({ message: 'La cédula/DNI es un campo requerido' })
  @IsString()
  document_number!: string;

  @IsNotEmpty({ message: 'El teléfono es un campo requerido' })
  @IsString()
  phone!: string;

  @IsNotEmpty({ message: 'Laa fecha de inicio es un campo requerido' })
  @IsDateString()
  start_date!: string;

  //campos opcionales
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
