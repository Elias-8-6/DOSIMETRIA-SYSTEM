import { IsNotEmpty, IsString, IsEmail, IsOptional } from 'class-validator';

export class CreateClientDto {
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  contact_name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El email de contacto, no es valido' })
  contact_email?: string;
}
