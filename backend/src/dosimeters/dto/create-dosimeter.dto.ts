import { IsNotEmpty, IsString, IsNumber, IsOptional, IsEnum, IsUUID, IsDateString, Min, IsInt } from 'class-validator';

export class CreateDosimeterDto {
  @IsNotEmpty()
  @IsString()
  serial_number!: string;

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
  @IsString()
  notes?: string;
}