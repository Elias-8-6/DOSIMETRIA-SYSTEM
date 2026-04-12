import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum, IsOptional,
} from "class-validator";
import { Role } from "@common/interfaces/jwt-payload.interface";

export class CreateUserDto {
  @IsNotEmpty({ message: "El nombre completo es un campo requerido" })
  @IsString({ message: "Debe ser un string" })
  full_name: string;

  @IsNotEmpty({ message: "El email completo es un campo requerido" })
  @IsString({ message: "Debe ser un string" })
  @IsEmail({}, { message: "Debe cumplir con el formato de correo" })
  email: string;

  @IsNotEmpty({ message: "La password es un campo requerido" })
  @IsString({ message: "Debe ser un string" })
  @MinLength(8, { message: "El campo debe contener mínimo 8 caracteres" })
  password: string;

  @IsOptional({ message: "El rol es un campo requerido" })
  @IsString({ message: "Debe ser un string" })
  @IsEnum(Role)
  role_code: string;
}
