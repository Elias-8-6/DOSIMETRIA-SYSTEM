import { IsOptional, IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { IsUUID } from '@common/validators/is-uuid.validator';

export class QueryReportsDto {
  @IsOptional()
  @IsUUID()
  client_id?: string;

  @IsOptional()
  @IsIn(['MENSUAL_MINSA', 'URGENTE_DOSIS_EXCESIVA', 'HISTORIAL_POE_MINSA', 'TRIAJE_RECEPCION'])
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
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
