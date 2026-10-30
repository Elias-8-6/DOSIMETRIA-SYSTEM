import { IsIn, IsNumberString, IsOptional, IsString } from 'class-validator';

export class QueryHoldersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['disponible', 'ensamblado', 'en_campo', 'en_triaje', 'danado', 'baja'])
  status?: string;

  @IsOptional()
  @IsIn(['integro', 'danado_leve', 'danado_grave', 'sello_roto', 'contaminado', 'perdido'])
  current_condition?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
