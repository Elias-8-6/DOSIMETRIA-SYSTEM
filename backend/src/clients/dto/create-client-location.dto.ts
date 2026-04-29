import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateClientLocationDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la sede es requerido' })
  name: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  contact_name?: string;

  @IsIn(['rayos_x', 'gamma', 'neutrones', 'beta', 'mixta', 'otro'], {
    message: 'Tipo de radiación no válido',
  })
  @IsOptional()
  radiation_type?: string;

  @IsIn(['bajo', 'medio', 'alto'], { message: 'Nivel de riesgo no válido' })
  @IsOptional()
  risk_level?: string;
}
