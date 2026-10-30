import { IsIn, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export class DisassembleDosimeterDto {
  @IsNotEmpty({ message: 'El ID del ensamble o portadosímetro es requerido' })
  @Matches(UUID_REGEX, { message: 'assembly_id debe ser un UUID válido' })
  assembly_id!: string;

  @IsOptional()
  @IsIn(['disponible', 'en_triaje', 'danado', 'baja'], {
    message: 'holder_target_status no es válido',
  })
  holder_target_status?: string;

  @IsOptional()
  @IsIn(['disponible', 'en_lectura', 'en_annealing', 'baja'], {
    message: 'tld_target_status no es válido',
  })
  tld_target_status?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
