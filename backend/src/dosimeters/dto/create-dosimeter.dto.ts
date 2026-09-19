import { IsNotEmpty, IsString, IsNumber, IsOptional, IsUUID, IsDateString, Min, Max, IsInt, IsIn, IsBoolean, MinLength, MaxLength } from 'class-validator';

export class CreateDosimeterDto {
  @IsNotEmpty({ message: 'El número de serie es obligatorio' })
  @IsString()
  @MinLength(3, { message: 'El número de serie debe tener al menos 3 caracteres' })
  @MaxLength(50, { message: 'El número de serie no puede superar 50 caracteres' })
  serial_number!: string;

  @IsNotEmpty({ message: 'El tipo de dosímetro es obligatorio' })
  @IsUUID()
  dosimeter_type_id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'El código interno no puede superar 50 caracteres' })
  internal_code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'El número de lote no puede superar 50 caracteres' })
  lot_number?: string;

  @IsOptional()
  @IsDateString()
  manufacture_date?: string;

  @IsOptional()
  @IsDateString()
  commissioning_date?: string;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'El período de uso debe ser al menos 1 día' })
  @Max(365, { message: 'El período de uso no puede superar 365 días' })
  wear_period_days?: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'El límite de dosis no puede ser negativo' })
  @Max(1000, { message: 'El límite de dosis no puede superar 1000 mSv' })
  max_dose_limit?: number;

  @IsOptional()
  @IsDateString()
  last_annealing_date?: string;

  @IsOptional()
  @IsIn(['normal', 'danado', 'contaminado', 'perdido'])
  current_condition?: string;

  @IsOptional()
  @IsBoolean()
  reusable?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Las notas no pueden superar 500 caracteres' })
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'El modelo no puede superar 100 caracteres' })
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'El fabricante no puede superar 100 caracteres' })
  manufacturer?: string;

  @IsOptional()
  @IsString()
  photo_url?: string;
}