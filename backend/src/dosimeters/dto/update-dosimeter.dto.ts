import { IsNotEmpty, IsString, IsNumber, IsOptional, IsEnum, IsUUID, IsDateString, IsIn, IsBoolean } from 'class-validator';

export class UpdateDosimeterDto {
  @IsOptional()
  @IsString()
  serial_number?: string;

  @IsOptional()
  @IsUUID()
  dosimeter_type_id?: string;

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
  @IsDateString()
  wear_period_days?: number;

  @IsOptional()
  @IsNumber()
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
  notes?: string;
}