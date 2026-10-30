import { IsIn, IsNumberString, IsOptional, IsString } from 'class-validator';

export class QueryTldCardsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['disponible', 'ensamblado', 'en_lectura', 'en_annealing', 'baja'])
  status?: string;

  @IsOptional()
  @IsIn(['2', '4'])
  elements_count?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
