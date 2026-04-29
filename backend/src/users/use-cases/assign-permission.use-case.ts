import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AssignPermissionDto } from '../dto/assign-permission.dto';

@Injectable()
export class AssignPermissionUseCase {
  private readonly logger = new Logger(AssignPermissionUseCase.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * execute()
   *
   * Asigna un permiso a un usuario con granted = true.
   * Si el permiso ya existe con granted = false, lo reactiva.
   * Si ya existe con granted = true, retorna el estado actual sin cambios.
   * Usa upsert para manejar los tres casos en una sola operación.
   *
   * @param userId         ID del usuario que recibe el permiso
   * @param dto            { permission_id: uuid }
   * @param organizationId Organización del admin — para aislamiento multi-tenant
   * @param grantedBy      user_id del admin que asigna — se guarda en granted_by
   */
  async execute(
    userId: string,
    dto: AssignPermissionDto,
    organizationId: string,
    grantedBy: string,
  ) {
    const client = this.supabase.getClient();

    // Bloquear auto-asignación
    // Un admin no puede asignarse permisos a sí mismo.
    // Previene escalada de privilegios.
    if (userId === grantedBy) {
      throw new BadRequestException('No podés asignarte permisos a vos mismo');
    }

    // Verificar que el usuario destino existe en la organización
    // Un admin no puede asignar permisos a usuarios de otra organización.
    const { data: targetUser } = await client
      .from('users')
      .select('id, full_name, status')
      .eq('id', userId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!targetUser) {
      throw new NotFoundException('Usuario no encontrado en esta organización');
    }

    if (targetUser.status !== 'active') {
      throw new BadRequestException('No se pueden asignar permisos a un usuario inactivo');
    }

    // Verificar que el permiso existe en el catálogo
    const { data: permission } = await client
      .from('permissions')
      .select('id, code, module, action, description')
      .eq('id', dto.permission_id)
      .maybeSingle();

    if (!permission) {
      throw new NotFoundException(
        `El permiso con id '${dto.permission_id}' no existe en el catálogo`,
      );
    }

    // Verificar si ya tiene el permiso activo
    const { data: existingPermission } = await client
      .from('user_permissions')
      .select('id, granted')
      .eq('user_id', userId)
      .eq('permission_id', dto.permission_id)
      .maybeSingle();

    if (existingPermission?.granted === true) {
      // Ya tiene el permiso activo — no hacemos nada
      return {
        message: `El usuario ya tiene el permiso '${permission.code}' activo`,
        permission: permission,
        changed: false,
      };
    }

    // Upsert en user_permissions
    // upsert maneja dos casos:
    //   a) Si no existe el registro → INSERT
    //   b) Si existe con granted = false → UPDATE a granted = true
    // onConflict indica qué columnas forman la clave única para detectar
    // si el registro ya existe (coincide con el UNIQUE de la migración 010)
    const { error: upsertError } = await client.from('user_permissions').upsert(
      {
        user_id: userId,
        permission_id: dto.permission_id,
        granted: true,
        granted_by: grantedBy,
        granted_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,permission_id' },
    );

    if (upsertError) {
      this.logger.error('Error al asignar permiso:', upsertError);
      throw new Error('No se pudo asignar el permiso');
    }

    // Registrar en audit_logs
    const action = existingPermission ? 'UPDATE' : 'CREATE';

    await client.from('audit_logs').insert({
      user_id: grantedBy,
      entity_name: 'user_permissions',
      entity_id: userId,
      action,
      old_values: existingPermission ? { granted: false } : null,
      new_values: {
        permission_code: permission.code,
        granted: true,
        granted_by: grantedBy,
      },
    });

    return {
      message: `Permiso '${permission.code}' asignado correctamente`,
      permission: permission,
      changed: true,
    };
  }
}
