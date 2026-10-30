import { IsOptional, IsNumberString, Matches } from 'class-validator';
import { UUID_REGEX } from './query-workers.dto';

export class MedicalAlertQueryDto {
  /** Días máximos de antelación para considerar una alerta preventiva (por defecto 60) */
  @IsOptional()
  @IsNumberString()
  threshold_days?: string;

  @IsOptional()
  @Matches(UUID_REGEX, { message: 'client_id must be a UUID' })
  client_id?: string;
}
