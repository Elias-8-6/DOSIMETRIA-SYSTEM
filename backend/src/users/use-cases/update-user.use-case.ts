import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class UpdateUserUseCase {
  private readonly logger = new Logger(UpdateUserUseCase.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * execute()
   *
   * Actualiza full_name y/o email de un usuario existente.
   * Solo actualiza los campos que llegaron en el DTO.
   *
   * @param userId         ID del usuario a actualizar
   * @param dto            Campos a actualizar (todos opcionales)
   * @param organizationId Organización del admin — para aislamiento multi-tenant
   * @param requestingUserId user_id del admin que hace el request — para audit_log
   */
  async execute(
    userId: string,
    dto: UpdateUserDto,
    organizationId: string,
    requestingUserId: string,
  ) {
    const client = this.supabase.getClient();

    // 1. Verificar que el usuario existe en la organización
    // Un admin no puede editar usuarios de otras organizaciones.
    const { data: existingUser } = await client
      .from('users')
      .select('id, full_name, email, status')
      .eq('id', userId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!existingUser) {
      throw new NotFoundException('Usuario no encontrado en esta organización');
    }

    //Verificar que el nuevo email no esté tomado
    // Solo si viene un email nuevo y es diferente al actual.
    if (dto.email && dto.email !== existingUser.email) {
      const { data: emailTaken } = await client
        .from('users')
        .select('id')
        .eq('email', dto.email)
        .eq('organization_id', organizationId)
        .neq('id', userId) // excluir al propio usuario
        .maybeSingle();

      if (emailTaken) {
        throw new ConflictException(`El email '${dto.email}' ya está en uso en esta organización`);
      }
    }

    //Construir solo los campos que llegaron en el DTO
    // Si un campo es undefined no se incluye en el UPDATE.
    // Esto permite actualizar solo full_name sin tocar el email y viceversa.
    const updateData: Record<string, any> = {};

    if (dto.full_name !== undefined) updateData.full_name = dto.full_name;
    if (dto.email !== undefined) updateData.email = dto.email;

    // Si no llegó ningún campo válido, no tiene sentido hacer el UPDATE
    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException(
        'No hay campos para actualizar — enviá al menos full_name o email',
      );
    }

    //Actualizar el usuario
    const { data: updatedUser, error } = await client
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, full_name, email, status, created_at')
      .single();

    if (error || !updatedUser) {
      this.logger.error('Error al actualizar usuario:', error);
      throw new Error('No se pudo actualizar el usuario');
    }

    //  Registrar en audit_logs
    await client.from('audit_logs').insert({
      user_id: requestingUserId,
      entity_name: 'users',
      entity_id: userId,
      action: 'UPDATE',
      old_values: {
        full_name: existingUser.full_name,
        email: existingUser.email,
      },
      new_values: updateData,
    });

    return updatedUser;
  }
}
