import { IsOptional, IsUUID, IsString, IsDateString } from 'class-validator';

export class QueryExcessiveDoseAlertsDto {
  @IsOptional()
  @IsUUID()
  client_id?: string;

  @IsOptional()
  @IsUUID()
  worker_id?: string;

  @IsOptional()
  @IsString()
  incident_status?: string;

  @IsOptional()
  @IsDateString()
  from_date?: string;

  @IsOptional()
  @IsDateString()
  to_date?: string;
}
