import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { IsUUID } from '@common/validators/is-uuid.validator';

export class IngestSingleReadingDto {
  @IsNotEmpty({ message: 'El número de serie de la tarjeta TLD es obligatorio' })
  @IsString()
  tld_serial_number!: string;

  @IsOptional()
  @IsUUID({ message: 'tld_card_id debe ser un UUID válido' })
  tld_card_id?: string;

  @IsOptional()
  @IsUUID({ message: 'dosimeter_id debe ser un UUID válido' })
  dosimeter_id?: string;

  @IsOptional()
  @IsUUID({ message: 'service_order_id debe ser un UUID válido' })
  service_order_id?: string;

  @IsOptional()
  @IsUUID({ message: 'equipment_id debe ser un UUID válido' })
  equipment_id?: string;

  @IsNotEmpty({ message: 'La fecha y hora de la lectura es obligatoria' })
  @IsDateString()
  read_at!: string;

  @IsNotEmpty({ message: 'La carga de la pastilla 1 (nC) es obligatoria' })
  @IsNumber({}, { message: 'charge_pos1_nc debe ser numérico' })
  @Min(0)
  charge_pos1_nc!: number;

  @IsNotEmpty({ message: 'La carga de la pastilla 2 (nC) es obligatoria' })
  @IsNumber({}, { message: 'charge_pos2_nc debe ser numérico' })
  @Min(0)
  charge_pos2_nc!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  charge_pos3_nc?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  charge_pos4_nc?: number;

  @IsNotEmpty({ message: 'La dosis medida calculada (mSv) es obligatoria' })
  @IsNumber({}, { message: 'measured_dose debe ser numérico' })
  @Min(0)
  measured_dose!: number;

  @IsOptional()
  @IsString()
  dose_unit?: string = 'mSv';

  @IsOptional()
  @IsNumber()
  @Min(0)
  uncertainty?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hp10?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hp007?: number;

  @IsOptional()
  @IsIn(['valido', 'sospechoso', 'invalido', 'fuera_rango'])
  reading_status?: string = 'valido';

  @IsOptional()
  raw_data?: Record<string, any>;
}

export class IngestReadingsBatchDto {
  @IsNotEmpty({ message: 'El nombre del archivo fuente es obligatorio' })
  @IsString()
  source_file_name!: string;

  @IsNotEmpty({ message: 'El hash SHA-256 del archivo fuente es obligatorio para auditoría e idempotencia' })
  @IsString()
  source_file_sha256!: string;

  @IsNotEmpty({ message: 'El factor de calibración Sr-90 / Y-90 es obligatorio' })
  @IsNumber()
  @Min(0)
  cal_factor_sr90!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  traveler_charge_nc?: number;

  @IsOptional()
  @IsDateString()
  period_start?: string;

  @IsOptional()
  @IsDateString()
  period_end?: string;

  @IsArray({ message: 'El lote debe incluir al menos una lectura' })
  @ArrayMinSize(1, { message: 'El lote debe incluir al menos una lectura' })
  @ValidateNested({ each: true })
  @Type(() => IngestSingleReadingDto)
  readings!: IngestSingleReadingDto[];
}
