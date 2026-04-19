import { IsNotEmpty, IsOptional, IsUUID, IsString } from 'class-validator';


export class CreateWorkerDto  {
    @IsNotEmpty({message: 'El Nombre completo es un campo es obligatorio'})
    @IsString()
    full_name: string;

    @IsOptional()
    @IsString()
    document_number?: string;

    @IsOptional()
    @IsString()
    employee_code?: string;

    @IsOptional()
    @IsUUID()
    client_location_id?: string;
}