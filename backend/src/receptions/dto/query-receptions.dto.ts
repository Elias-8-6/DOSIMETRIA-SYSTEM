import { IsIn, IsNumberString, IsOptional, IsString } from 'class-validator';
import { IsUUID } from '@common/validators/is-uuid.validator';
import { PACKAGING_CONDITIONS, PackagingCondition } from './create-reception.dto';

export class QueryReceptionsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(PACKAGING_CONDITIONS, {
    message: `packaging_condition debe ser uno de: ${PACKAGING_CONDITIONS.join(', ')}`,
  })
  packaging_condition?: PackagingCondition;

  @IsOptional()
  @IsUUID()
  service_order_id?: string;

  @IsOptional()
  @IsUUID()
  client_id?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
