import { IsIn, IsOptional, IsString } from 'class-validator';
import { PACKAGING_CONDITIONS, PackagingCondition } from './create-reception.dto';

export class UpdateReceptionDto {
  @IsOptional()
  @IsIn(PACKAGING_CONDITIONS, {
    message: `packaging_condition debe ser uno de: ${PACKAGING_CONDITIONS.join(', ')}`,
  })
  packaging_condition?: PackagingCondition;

  @IsOptional()
  @IsString()
  observations?: string;
}
