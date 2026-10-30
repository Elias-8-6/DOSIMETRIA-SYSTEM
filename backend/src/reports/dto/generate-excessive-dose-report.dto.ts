import { IsUUID, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GenerateExcessiveDoseReportDto {
  @IsUUID()
  reading_id: string;

  @IsOptional()
  @IsUUID()
  incident_report_id?: string;

  @IsString()
  @IsNotEmpty()
  investigation_summary: string;

  @IsOptional()
  @IsString()
  corrective_actions?: string;

  @IsOptional()
  @IsString()
  opr_conclusion?: string;
}
