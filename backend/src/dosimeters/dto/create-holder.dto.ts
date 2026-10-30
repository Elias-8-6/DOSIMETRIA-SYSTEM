import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateHolderDto {
  @IsNotEmpty({ message: 'El código de barras es requerido' })
  @IsString({ message: 'El código de barras debe ser una cadena de texto' })
  @MinLength(3, { message: 'El código de barras debe tener al menos 3 caracteres' })
  @MaxLength(50, { message: 'El código de barras no puede superar 50 caracteres' })
  barcode!: string;

  @IsNotEmpty({ message: 'El número de serie del portadosímetro es requerido' })
  @IsString()
  @MinLength(3, { message: 'El número de serie debe tener al menos 3 caracteres' })
  @MaxLength(50, { message: 'El número de serie no puede superar 50 caracteres' })
  serial_number!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'El color no puede superar 30 caracteres' })
  holder_color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'El tipo de pinza/clip no puede superar 50 caracteres' })
  clip_type?: string;

  @IsOptional()
  @IsIn(['integro', 'danado_leve', 'danado_grave', 'sello_roto', 'contaminado', 'perdido'], {
    message: 'current_condition no es válida',
  })
  current_condition?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  photo_url?: string;
}
