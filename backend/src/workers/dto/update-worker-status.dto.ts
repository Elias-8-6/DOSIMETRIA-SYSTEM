import { IsIn, IsNotEmpty } from 'class-validator';

export class UpdateWorkerStatusDto {
  @IsIn(['active', 'inactive'], { message: 'El estado solo puede ser activo o inactivo.' })
  @IsNotEmpty({ message: 'El estado es un campo requerido' })
  status: 'active' | 'inactive';
}
