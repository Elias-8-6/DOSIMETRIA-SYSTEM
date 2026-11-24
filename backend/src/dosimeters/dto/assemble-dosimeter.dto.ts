import { IsNotEmpty, IsOptional, IsString, Matches, ValidateIf } from 'class-validator';

const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export class AssembleDosimeterDto {
  @IsNotEmpty({ message: 'El ID del portadosímetro es requerido' })
  @Matches(UUID_REGEX, { message: 'holder_id debe ser un UUID válido' })
  holder_id!: string;

  @ValidateIf((o) => !o.dosimeter_id)
  @IsNotEmpty({ message: 'Debe especificar dosimeter_id o tld_card_id' })
  @Matches(UUID_REGEX, { message: 'tld_card_id debe ser un UUID válido' })
  tld_card_id?: string;

  @ValidateIf((o) => !o.tld_card_id)
  @IsNotEmpty({ message: 'Debe especificar dosimeter_id o tld_card_id' })
  @Matches(UUID_REGEX, { message: 'dosimeter_id debe ser un UUID válido' })
  dosimeter_id?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
