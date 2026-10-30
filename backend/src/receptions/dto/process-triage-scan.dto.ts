import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { IsUUID } from '@common/validators/is-uuid.validator';

export const TRIAGE_CONDITIONS = [
  'integro',
  'danado_leve',
  'danado_grave',
  'sello_roto',
  'contaminado',
  'perdido',
] as const;

export class ProcessTriageScanDto {
  @IsNotEmpty({ message: 'El código de barras escaneado es obligatorio' })
  @IsString()
  barcode!: string;

  @IsNotEmpty({ message: 'La condición física observada es obligatoria' })
  @IsIn(TRIAGE_CONDITIONS, {
    message: `condition debe ser uno de: ${TRIAGE_CONDITIONS.join(', ')}`,
  })
  condition!: (typeof TRIAGE_CONDITIONS)[number];

  @IsOptional()
  @IsBoolean()
  sealed?: boolean;

  @IsNotEmpty({ message: 'El detector de radiación empleado es obligatorio (ISO 17025)' })
  @IsUUID({ message: 'survey_meter_id debe ser un UUID válido' })
  survey_meter_id!: string;

  @IsNotEmpty({ message: 'La tasa de dosis medida en triaje es obligatoria' })
  @IsNumber({}, { message: 'contamination_value debe ser un valor numérico' })
  @Min(0, { message: 'contamination_value no puede ser negativo' })
  contamination_value!: number;

  @IsOptional()
  @IsString()
  contamination_unit?: string;

  @IsOptional()
  @IsString()
  condition_photo_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observations?: string;
}
