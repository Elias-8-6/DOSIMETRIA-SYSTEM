import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTldCardDto {
  @IsNotEmpty({ message: 'El número de serie de la tarjeta TLD es requerido' })
  @IsString()
  @MinLength(3, { message: 'El número de serie debe tener al menos 3 caracteres' })
  @MaxLength(50, { message: 'El número de serie no puede superar 50 caracteres' })
  serial_number!: string;

  @IsNotEmpty({ message: 'El número de pastillas/elementos es requerido' })
  @IsInt({ message: 'elements_count debe ser un número entero' })
  @IsIn([2, 4], { message: 'elements_count debe ser 2 o 4 pastillas sensibles' })
  elements_count!: number;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'El material no puede superar 50 caracteres' })
  tld_material?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
