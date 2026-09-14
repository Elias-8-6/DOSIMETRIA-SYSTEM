import { IsNotEmpty, IsString, IsDateString, IsOptional, IsEnum, IsUUID } from 'class-validator';

export class AssignDosimeterDto {
    @IsNotEmpty({ message: 'El ID del dosímetro es obligatorio' })
    @IsUUID()
    worker_id!: string;

    @IsNotEmpty({ message: 'Fecha de asignacion obligatorio' })
    @IsDateString()
    assigned_at!: string;

    @IsOptional()
    @IsString()
    notes?: string;
}   