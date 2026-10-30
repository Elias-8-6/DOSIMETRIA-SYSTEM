import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { IsUUID } from '@common/validators/is-uuid.validator';

export class CreateReturnGuideItemDto {
  @IsOptional()
  @IsUUID({ message: 'holder_id debe ser un UUID válido' })
  holder_id?: string;

  @IsOptional()
  @IsUUID({ message: 'dosimeter_id debe ser un UUID válido' })
  dosimeter_id?: string;

  @IsOptional()
  @IsUUID({ message: 'worker_id debe ser un UUID válido' })
  worker_id?: string;

  @IsBoolean({ message: 'is_received debe ser un valor booleano' })
  is_received!: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateReturnGuideDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  carrier_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  driver_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  driver_document?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  delivered_by_client?: string;

  @IsOptional()
  @IsDateString()
  returned_at?: string;

  @IsOptional()
  @IsUUID({ message: 'reception_id debe ser un UUID válido' })
  reception_id?: string;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsArray({ message: 'La guía de devolución debe incluir el detalle de dosímetros' })
  @ArrayMinSize(1, { message: 'La guía de devolución debe incluir al menos un ítem' })
  @ValidateNested({ each: true })
  @Type(() => CreateReturnGuideItemDto)
  items!: CreateReturnGuideItemDto[];
}
