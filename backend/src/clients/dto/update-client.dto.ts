import {IsOptional, IsString, IsEmail} from 'class-validator';

export class UpdateClientDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    code?: string;

    @IsOptional()
    @IsString()
    contact_name?: string;

    @IsOptional()
    @IsEmail({}, {message: 'El email de contacto No es valido'})
    contact_email?: string;
}