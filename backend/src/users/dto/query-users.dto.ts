import { IsOptional, IsString, IsEnum, IsNumberString } from 'class-validator';

enum UserStatusFilter {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class QueryUsersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(UserStatusFilter)
  status?: UserStatusFilter;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
