import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { IsUUID } from '@common/validators/is-uuid.validator';

export const RECEPTION_ITEM_CONDITIONS = [
  'normal',
  'danado_fisico',
  'sello_roto',
  'contaminado',
  'perdido',
] as const;

export type ReceptionItemCondition = (typeof RECEPTION_ITEM_CONDITIONS)[number];

export class CreateReceptionItemDto {
  @IsUUID()
  dosimeter_id: string;

  @IsIn(RECEPTION_ITEM_CONDITIONS, {
    message: `received_condition debe ser uno de: ${RECEPTION_ITEM_CONDITIONS.join(', ')}`,
  })
  received_condition: ReceptionItemCondition = 'normal';

  @IsBoolean()
  @IsOptional()
  sealed?: boolean = true;

  @IsBoolean()
  @IsOptional()
  contaminated?: boolean = false;

  @IsString()
  @IsOptional()
  observations?: string;

  @IsString()
  @IsOptional()
  condition_photo_url?: string;
}
