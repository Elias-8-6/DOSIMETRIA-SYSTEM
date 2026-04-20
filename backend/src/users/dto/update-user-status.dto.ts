import { IsNotEmpty, IsString, IsOptional, IsEmail, MinLength, IsEnum } from 'class-validator';
import { Role } from '@common/interfaces/jwt-payload.interface';

export class UpdateUserStatusDto {
  @IsOptional()
  @IsString()
  status: string;
}
