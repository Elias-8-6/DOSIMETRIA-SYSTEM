import { IsOptional, IsString, IsIn, Matches, IsNumberString } from 'class-validator';

export const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export class QueryWorkersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;

  @IsOptional()
  @Matches(UUID_REGEX, { message: 'client_id must be a UUID' })
  client_id?: string;

  @IsOptional()
  @Matches(UUID_REGEX, { message: 'client_location_id must be a UUID' })
  client_location_id?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
