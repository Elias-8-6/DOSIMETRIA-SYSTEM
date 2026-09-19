import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsNotFutureDate } from '@common/utils/date.validators';

export class ReturnDosimeterDto {
    @IsNotEmpty({ message: 'La fecha de devolución del dosímetro es obligatoria' })
    @IsDateString()
    @IsNotFutureDate({ message: 'La fecha de devolución no puede ser una fecha futura' })
    returned_at!: string;

    @IsOptional()
    @IsIn(['normal', 'danado', 'contaminado', 'perdido'])
    current_condition?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500, { message: 'Las notas no pueden superar 500 caracteres' })
    notes?: string;
}