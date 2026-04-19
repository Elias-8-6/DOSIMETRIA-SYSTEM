import { IsNotEmpty, IsString, IsOptional } from 'class-validator';


export class CreateLocationDto {
    @IsNotEmpty({message: 'El nombre es un campo obligatorio'})
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    address?: string;


}
