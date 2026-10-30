import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { IsUUID } from '@common/validators/is-uuid.validator';
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
  @MaxLength(500, { message: 'Las observaciones no pueden superar 500 caracteres' })
  observations?: string;

  @IsOptional()
  @IsIn(['normal', 'urgente', 'critica'])
  priority?: string;

  // Nuevos campos técnicos normativos UTP / Minsa
  @IsOptional()
  @IsIn(['radiodiagnostico', 'aceleradores_lineales', 'medicina_nuclear', 'otro'], {
    message: 'radiological_practice debe ser: radiodiagnostico, aceleradores_lineales, medicina_nuclear u otro',
  })
  radiological_practice?: string;

  @IsOptional()
  @IsInt({ message: 'cycle_period_month debe ser un entero entre 1 y 12' })
  @Min(1)
  @Max(12)
  cycle_period_month?: number;

  @IsOptional()
  @IsInt({ message: 'cycle_period_year debe ser un año válido' })
  @Min(2025)
  cycle_period_year?: number;

  @IsArray({ message: 'La orden debe incluir al menos un dosímetro' })
  @ArrayMinSize(1, { message: 'La orden debe incluir al menos un dosímetro' })
  @ValidateNested({ each: true })
  @Type(() => CreateServiceOrderItemDto)
  items!: CreateServiceOrderItemDto[];
}
