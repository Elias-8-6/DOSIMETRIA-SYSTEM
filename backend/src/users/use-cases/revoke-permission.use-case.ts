import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';

@Injectable()
export class RevokePermissionUseCase {
  private readonly logger = new Logger(RevokePermissionUseCase.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * execute()
   *
   * Revoca un permiso de un usuario — NO lo elimina.
   * Actualiza granted = false para mantener la trazabilidad histórica.
   * ISO 17025: se debe poder auditar quién tuvo qué permiso y cuándo.
   *
   * @param userId         ID del usuario al que se revoca el permiso
   * @param permissionId   ID del permiso a revocar
   * @param organizationId Organización del admin
   * @param revokedBy      user_id del admin que revoca — para audit_log
   */
  async execute(userId: string, permissionId: string, organizationId: string, revokedBy: string) {
    const client = this.supabase.getClient();

    // Verificar que el usuario existe en la organización
    const { data: targetUser } = await client
      .from('users')
      .select('id, full_name')
      .eq('id', userId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!targetUser) {
      throw new NotFoundException('Usuario no encontrado en esta organización');
    }

    //Verificar que el permiso existe en el catálogo
    const { data: permission } = await client
      .from('permissions')
      .select('id, code, module, action')
      .eq('id', permissionId)
      .maybeSingle();

    if (!permission) {
      throw new NotFoundException(`El permiso con id '${permissionId}' no existe en el catálogo`);
    }

    //Verificar que el usuario tiene ese permiso asignado
    const { data: userPermission } = await client
      .from('user_permissions')
      .select('id, granted')
      .eq('user_id', userId)
      .eq('permission_id', permissionId)
      .maybeSingle();

    if (!userPermission) {
      throw new NotFoundException(`El usuario no tiene el permiso '${permission.code}' asignado`);
    }

    //Verificar que el permiso no esté ya revocado
    if (userPermission.granted === false) {
      return {
        message: `El permiso '${permission.code}' ya estaba revocado`,
        changed: false,
      };
    }

    //Revocar el permiso — granted = false
    // No eliminamos el registro — lo mantenemos con granted = false.
    // Esto preserva la trazabilidad: se puede auditar que el usuario
    // tuvo este permiso y cuándo fue revocado.
    const { error } = await client
      .from('user_permissions')
      .update({
        granted: false,
        granted_by: revokedBy, // quién lo revocó
        granted_at: new Date().toISOString(), // cuándo fue revocado
      })
      .eq('user_id', userId)
      .eq('permission_id', permissionId);

    if (error) {
      this.logger.error('Error al revocar permiso:', error);
      throw new Error('No se pudo revocar el permiso');
    }

    //Registrar en audit_logs
    await client.from('audit_logs').insert({
      user_id: revokedBy,
      entity_name: 'user_permissions',
      entity_id: userId,
      action: 'REVOKE_PERMISSION',
      old_values: {
        permission_code: permission.code,
        granted: true,
      },
      new_values: {
        permission_code: permission.code,
        granted: false,
        revoked_by: revokedBy,
      },
    });

    return {
      message: `Permiso '${permission.code}' revocado correctamente`,
      changed: true,
    };
  }
}
