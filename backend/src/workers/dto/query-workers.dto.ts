import { IsOptional, IsString, IsIn, IsUUID, IsNumber, IsNumberString } from 'class-validator';

export class QueryWorkersDto {
  @IsOptional()
  @IsString()
  search: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status: string;

  @IsOptional()
  @IsUUID()
  client_id: string;

  @IsOptional()
  @IsUUID()
  client_location_id: string;

  @IsOptional()
  @IsNumberString()
  page?: number;

  @IsOptional()
  @IsNumberString()
  limit?: number;
}
