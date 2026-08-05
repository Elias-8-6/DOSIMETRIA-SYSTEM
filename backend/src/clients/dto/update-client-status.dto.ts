import { IsIn, IsNotEmpty } from 'class-validator';

export class UpdateClientStatusDto {
  @IsIn(['active', 'inactive'], { message: 'El estado debe ser active o inactive' })
  @IsNotEmpty({ message: 'El estado es requerido' })
  status: 'active' | 'inactive';
}
