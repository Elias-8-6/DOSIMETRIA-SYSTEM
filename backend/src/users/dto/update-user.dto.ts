import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEmail,
  MinLength,
  IsEnum,
} from "class-validator";
import { Role } from "@common/interfaces/jwt-payload.interface";

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  full_name: string;

  @IsOptional()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  @IsEnum(Role)
  role_code: string;
}
