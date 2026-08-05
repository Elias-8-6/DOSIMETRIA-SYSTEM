import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { UpdateUserStatusDto } from '../dto/update-user-status.dto';

@Injectable()
export class DeactivateUserUseCase {
  private readonly logger = new Logger(DeactivateUserUseCase.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * execute()
   *
   * Cambia el status de un usuario entre 'active' e 'inactive'.
   * No elimina el usuario — preserva toda su trazabilidad histórica.
   *
   * @param userId           ID del usuario a actualizar
   * @param dto              { status: 'active' | 'inactive' }
   * @param organizationId   Organización del admin
   * @param requestingUserId user_id del admin — para validar auto-desactivación
   */
  async execute(
    userId: string,
    dto: UpdateUserStatusDto,
    organizationId: string,
    requestingUserId: string,
  ) {
    const client = this.supabase.getClient();

    // Bloquear auto-desactivación
    // Un admin no puede desactivarse a sí mismo.
    // Evita que el sistema quede sin ningún admin activo por accidente.
    if (userId === requestingUserId) {
      throw new BadRequestException('No podés cambiar el estado de tu propio usuario');
    }

    //Verificar que el usuario existe en la organización
    const { data: existingUser } = await client
      .from('users')
      .select('id, full_name, email, status')
      .eq('id', userId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!existingUser) {
      throw new NotFoundException('Usuario no encontrado en esta organización');
    }

    // Verificar que el status realmente cambia
    // Si el status ya es el mismo, no hacemos el UPDATE innecesariamente.
    if (existingUser.status === dto.status) {
      return {
        id: existingUser.id,
        status: existingUser.status,
        message: `El usuario ya tiene status '${dto.status}'`,
      };
    }

    // Actualizar el status
    const { data: updatedUser, error } = await client
      .from('users')
      .update({ status: dto.status })
      .eq('id', userId)
      .select('id, full_name, email, status')
      .single();

    if (error || !updatedUser) {
      this.logger.error('Error al actualizar status:', error);
      throw new Error('No se pudo actualizar el status del usuario');
    }

    // Registrar en audit_logs
    // action STATUS_CHANGE es diferente a UPDATE — permite filtrar
    // específicamente cambios de estado en las auditorías ISO 17025.
    await client.from('audit_logs').insert({
      user_id: requestingUserId,
      entity_name: 'users',
      entity_id: userId,
      action: 'STATUS_CHANGE',
      old_values: { status: existingUser.status },
      new_values: { status: dto.status },
    });

    return {
      id: updatedUser.id,
      full_name: updatedUser.full_name,
      email: updatedUser.email,
      status: updatedUser.status,
    };
  }
}
