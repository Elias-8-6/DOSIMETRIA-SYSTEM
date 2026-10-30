import { IsOptional, IsUUID, IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryReportsDto {
  @IsOptional()
  @IsUUID()
  client_id?: string;

  @IsOptional()
  @IsIn(['MENSUAL_CLIENTE', 'CONSOLIDADO_ANUAL', 'HISTORIAL_POE', 'URGENTE_DOSIS_EXCESIVA'])
  report_type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @IsIn(['EMITIDO', 'ANULADO'])
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
