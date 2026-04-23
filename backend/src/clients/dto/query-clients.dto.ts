import { IsIn, IsOptional, IsString } from 'class-validator';

export class QueryClientsDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsIn(['active', 'inactive'])
  @IsOptional()
  status?: string;

  @IsIn(['hospital', 'clinica', 'industria', 'investigacion', 'gobierno', 'otro'])
  @IsOptional()
  client_type?: string;
}
