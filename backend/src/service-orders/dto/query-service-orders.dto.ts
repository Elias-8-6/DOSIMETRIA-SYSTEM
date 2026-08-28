import { IsIn, IsNumberString, IsOptional, IsString, IsUUID } from 'class-validator';

export class QueryServiceOrdersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['PENDING', 'RECEIVED', 'IN_PROCESS', 'QC_REVIEW', 'COMPLETED', 'CANCELLED'])
  status?: string;

  @IsOptional()
  @IsIn(['lectura_dosis', 'lectura_y_recarga', 'mantenimiento', 'calibracion'])
  service_type?: string;

  @IsOptional()
  @IsIn(['normal', 'urgente', 'critica'])
  priority?: string;

  @IsOptional()
  @IsUUID()
  client_id?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
