import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateSurveyMeterDto {
  @IsNotEmpty({ message: 'El modelo del detector es obligatorio' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  model!: string;

  @IsNotEmpty({ message: 'El número de serie es obligatorio' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  serial_number!: string;

  @IsNotEmpty({ message: 'El fabricante es obligatorio' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  manufacturer!: string;

  @IsNotEmpty({ message: 'El número de certificado de calibración es obligatorio' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  calibration_certificate!: string;

  @IsNotEmpty({ message: 'La fecha de calibración es obligatoria' })
  @IsDateString()
  calibration_date!: string;

  @IsOptional()
  @IsDateString()
  calibration_expiry_date?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
