import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { CreateServiceOrderItemDto } from './create-service-order-item.dto';

export class CreateServiceOrderDto {
  @IsNotEmpty({ message: 'El cliente es obligatorio' })
  @IsUUID()
  client_id!: string;

  @IsNotEmpty({ message: 'El tipo de servicio es obligatorio' })
  @IsIn(['lectura_dosis', 'lectura_y_recarga', 'mantenimiento', 'calibracion'])
  service_type!: string;

  @IsOptional()
  @IsDateString()
  requested_date?: string;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsOptional()
  @IsIn(['normal', 'urgente', 'critica'])
  priority?: string;

  @IsArray({ message: 'La orden debe incluir al menos un dosímetro' })
  @ArrayMinSize(1, { message: 'La orden debe incluir al menos un dosímetro' })
  @ValidateNested({ each: true })
  @Type(() => CreateServiceOrderItemDto)
  items!: CreateServiceOrderItemDto[];
}
