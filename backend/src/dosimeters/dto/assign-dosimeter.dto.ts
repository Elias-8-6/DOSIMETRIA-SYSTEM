import { IsNotEmpty, IsString, IsDateString, IsOptional, IsUUID } from 'class-validator';
import { IsNotFutureDate } from '@common/utils/date.validators';

export class AssignDosimeterDto {
    @IsNotEmpty({ message: 'El trabajador es obligatorio' })
    @IsUUID()
    worker_id!: string;

    @IsNotEmpty({ message: 'La fecha de asignación es obligatoria' })
    @IsDateString()
    @IsNotFutureDate({ message: 'La fecha de asignación no puede ser una fecha futura' })
    assigned_at!: string;

    @IsOptional()
    @IsString()
    notes?: string;
}