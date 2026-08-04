import { IsNotEmpty, IsString, IsNumber, IsOptional, IsEnum, IsUUID, IsDateString, Min, IsInt, IsIn, IsBoolean } from 'class-validator';

export class CreateDosimeterDto {
  @IsNotEmpty({ message: 'El número de serie es obligatorio' })
  @IsString()
  serial_number!: string;

  @IsNotEmpty({ message: 'El tipo de dosímetro es obligatorio' })
  @IsUUID()
  dosimeter_type_id!: string;

  @IsOptional()
  @IsString()
  internal_code?: string;

  @IsOptional()
  @IsString()
  lot_number?: string;

  @IsOptional()
  @IsDateString()
  manufacture_date?: string;

  @IsOptional()
  @IsDateString()
  commissioning_date?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  wear_period_days?: number;

  @IsOptional()
  @IsNumber()
  max_dose_limit?: number;

  @IsOptional()
  @IsDateString()
  last_annealing_date?: string;

  @IsOptional()
  @IsIn(['normal', 'danado', 'contaminado', 'perdido'])
  current_condition!: string;

  @IsOptional()
  @IsBoolean()
  reusable?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}