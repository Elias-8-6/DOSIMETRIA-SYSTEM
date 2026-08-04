import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateDosimeterStatusDto {
    @IsNotEmpty({ message: 'El estado del dosímetro es obligatorio' })
    @IsIn(['DISPONIBLE', 'ASIGNADO', 'EN_LAB', 'EN_LECTURA', 'PROCESADO', 'ENTREGADO', 'BAJA', 'INCIDENTE'], { message: 'El código de estado no es valido' })
    status!: string;

    @IsNotEmpty({ message: 'El ID del dosímetro es obligatorio' })
    status_code!: string;

}