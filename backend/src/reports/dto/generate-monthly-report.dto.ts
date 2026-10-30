import {
  IsUUID,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsString,
  IsObject,
} from 'class-validator';

export class GenerateMonthlyReportDto {
  @IsUUID()
  client_id: string;

  @IsOptional()
  @IsUUID()
  service_order_id?: string;

  @IsInt()
  @Min(2000)
  @Max(2100)
  period_year: number;

  @IsInt()
  @Min(1)
  @Max(12)
  period_month: number;

  @IsOptional()
  @IsString()
  dosimetry_notes?: string;

  @IsOptional()
  @IsObject()
  additional_metadata?: Record<string, any>;
}
