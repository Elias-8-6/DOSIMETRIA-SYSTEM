import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, IsDateString, IsInt, Min, IsNumber, IsBoolean, IsNumberString } from 'class-validator';

export class QueryDosimetersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  dosimeter_type_id?: string;

  @IsOptional()
  @IsString()
  status_code?: string;

  @IsOptional()
  @IsIn(['Normal', 'Dañado', 'Contaminado', 'Perdido'])
  current_condition?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

}