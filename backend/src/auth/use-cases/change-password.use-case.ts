import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { SupabaseService } from '../../config/supabase.config';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { AuditService } from '@common/services/audit.service';
import { RequestMeta } from '@common/interfaces/request-meta.interface';

@Injectable()
export class ChangePasswordUseCase {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  async execute(userId: string, dto: ChangePasswordDto, meta: RequestMeta = {}) {
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

    await this.audit.log({
      userId,
      entityName: 'users',
      entityId: userId,
      action: 'UPDATE',
      newValues: { password_changed: true },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return { message: 'Contraseña actualizada correctamente' };
  }
}
