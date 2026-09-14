import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateServiceOrderDto {
  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsOptional()
  @IsIn(['normal', 'urgente', 'critica'])
  priority?: string;
}
