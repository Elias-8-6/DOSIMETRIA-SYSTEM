import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { SupabaseService } from '../../config/supabase.config';
import { ChangePasswordDto } from '../dto/change-password.dto';

@Injectable()
export class ChangePasswordUseCase {
  constructor(private readonly supabase: SupabaseService) {}

  async execute(userId: string, dto: ChangePasswordDto) {
    // Validar que nueva contraseña y confirmación coinciden
    if (dto.new_password !== dto.confirm_password) {
      throw new BadRequestException(
        'La nueva contraseña y la confirmación no coinciden',
      );
    }

    // Obtener el hash actual del usuario
    const { data: user } = await this.supabase
      .getClient()
      .from('users')
      .select('id, password_hash')
      .eq('id', userId)
      .maybeSingle();

    if (!user) throw new NotFoundException('Usuario no encontrado');

    // Verificar que la contraseña actual es correcta
    const isValid = await bcrypt.compare(dto.current_password, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    // Validar que la nueva contraseña es diferente a la actual
    const isSame = await bcrypt.compare(dto.new_password, user.password_hash);
    if (isSame) {
      throw new BadRequestException(
        'La nueva contraseña debe ser diferente a la actual',
      );
    }

    // Hashear la nueva contraseña
    const newHash = await bcrypt.hash(dto.new_password, 10);

    const { error } = await this.supabase
      .getClient()
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', userId);

    if (error) throw new Error(error.message);

    return { message: 'Contraseña actualizada correctamente' };
  }
}
