import { IsOptional, IsString, IsEnum } from 'class-validator';

enum UserStatusFilter {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class QueryUsersDto {
  @IsOptional()
  @IsString()
  search?: string; // filtra por full_name o email

  @IsOptional()
  @IsEnum(UserStatusFilter)
  status?: UserStatusFilter; // filtra por active o inactive
}
