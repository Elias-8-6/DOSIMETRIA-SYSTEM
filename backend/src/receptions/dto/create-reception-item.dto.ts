import { IsBoolean, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
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
  @IsOptional()
  @IsUUID()
  dosimeter_id?: string;

  @IsOptional()
  @IsUUID()
  holder_id?: string;

  @IsOptional()
  @IsString()
  scanned_barcode?: string;

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

  @IsOptional()
  @IsNumber()
  contamination_value?: number;

  @IsOptional()
  @IsString()
  contamination_unit?: string;

  @IsOptional()
  @IsUUID()
  survey_meter_id?: string;

  @IsOptional()
  @IsBoolean()
  is_quarantined?: boolean;

  @IsString()
  @IsOptional()
  observations?: string;

  @IsString()
  @IsOptional()
  condition_photo_url?: string;
}
