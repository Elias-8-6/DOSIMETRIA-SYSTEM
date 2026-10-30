import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { IsUUID } from '@common/validators/is-uuid.validator';

export class CreateDispatchGuideItemDto {
  @IsOptional()
  @IsUUID({ message: 'holder_id debe ser un UUID válido' })
  holder_id?: string;

  @IsOptional()
  @IsUUID({ message: 'dosimeter_id debe ser un UUID válido' })
  dosimeter_id?: string;

  @IsOptional()
  @IsUUID({ message: 'worker_id debe ser un UUID válido' })
  worker_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  target_location?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateDispatchGuideDto {
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
  @IsUUID({ message: 'traveler_holder_id debe ser un UUID válido' })
  traveler_holder_id?: string;

  @IsOptional()
  @IsDateString()
  dispatched_at?: string;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsArray({ message: 'La guía de entrega debe incluir al menos un dosímetro a despachar' })
  @ArrayMinSize(1, { message: 'La guía de entrega debe incluir al menos un dosímetro a despachar' })
  @ValidateNested({ each: true })
  @Type(() => CreateDispatchGuideItemDto)
  items!: CreateDispatchGuideItemDto[];
}
