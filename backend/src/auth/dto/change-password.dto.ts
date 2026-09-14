import { IsNotEmpty, IsString } from 'class-validator';
import { IsStrongAppPassword } from '@common/utils/password.util';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'La contraseña actual es requerida' })
  current_password: string;

  @IsStrongAppPassword()
  new_password: string;

  @IsString()
  @IsNotEmpty({ message: 'La confirmación de contraseña es requerida' })
  confirm_password: string;
}
