import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { IsUUID } from '@common/validators/is-uuid.validator';

export class GenerateWorkerHistoryDto {
  @IsOptional()
  @IsUUID()
  worker_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1950)
  @Max(2100)
  from_year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1950)
  @Max(2100)
  to_year?: number;
}
