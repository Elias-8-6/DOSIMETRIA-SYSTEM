import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { IsUUID } from '@common/validators/is-uuid.validator';
import { CreateReceptionItemDto } from './create-reception-item.dto';

export const PACKAGING_CONDITIONS = ['integro', 'danado_leve', 'danado_grave'] as const;
export type PackagingCondition = (typeof PACKAGING_CONDITIONS)[number];

export class CreateReceptionDto {
  @IsUUID()
  service_order_id: string;

  @IsIn(PACKAGING_CONDITIONS, {
    message: `packaging_condition debe ser uno de: ${PACKAGING_CONDITIONS.join(', ')}`,
  })
  packaging_condition: PackagingCondition;

  @IsString()
  @IsOptional()
  observations?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Debe incluir al menos un dosímetro para recepcionar' })
  @ValidateNested({ each: true })
  @Type(() => CreateReceptionItemDto)
  items: CreateReceptionItemDto[];
}
