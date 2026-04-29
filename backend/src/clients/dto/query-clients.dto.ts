import { IsIn, IsOptional, IsString, IsNumberString } from 'class-validator';

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

  @IsNumberString()
  @IsOptional()
  page?: string;

  @IsNumberString()
  @IsOptional()
  limit?: string;
}
