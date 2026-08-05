import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReturnDosimeterDto {
    @IsNotEmpty({ message: 'La fecha de devolucion del dosímetro es obligatorio' })
    @IsDateString()
    returned_at!: string;

    @IsOptional()
    @IsIn(['normal', 'danado', 'contaminado', 'perdido'])
    current_condition?: string;

    @IsOptional()
    @IsString()
    notes?: string;

}