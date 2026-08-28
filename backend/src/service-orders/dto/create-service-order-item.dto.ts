import { IsIn, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateServiceOrderItemDto {
  @IsNotEmpty({ message: 'El dosímetro es obligatorio' })
  @IsUUID()
  dosimeter_id!: string;

  @IsNotEmpty({ message: 'La acción solicitada es obligatoria' })
  @IsIn(['lectura', 'limpieza', 'recarga', 'inspeccion'])
  requested_action!: string;
}
