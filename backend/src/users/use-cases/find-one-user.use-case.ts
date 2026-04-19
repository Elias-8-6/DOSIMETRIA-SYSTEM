import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';

@Injectable()
export class FindOneUserUseCase {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * execute()
   *
   * Retorna el detalle completo de un usuario:
   * datos base, roles asignados y permisos activos.
   * Nunca retorna password_hash.
   *
   * @param userId         ID del usuario a buscar
   * @param organizationId Organización del admin — para aislamiento multi-tenant
   */
  async execute(
      userId: string,
      organizationId: string
  ) {
    const client = this.supabase.getClient();

    // Query 1: datos base del usuario
    const { data: user, error } = await client
      .from('users')
      .select('id, full_name, email, status, created_at')
      .eq('id', userId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error || !user) {
      throw new NotFoundException('Usuario no encontrado en esta organización');
    }

    // Query 2: roles del usuario
    const { data: rolesData } = await client
      .from('user_roles')
      .select('roles ( code, name )')
      .eq('user_id', userId);

    // Query 3: permisos activos del usuario
    const { data: permissionsData } = await client
      .from('user_permissions')
      .select('granted, permissions ( id, code, module, action, description )')
      .eq('user_id', userId)
      .eq('granted', true);

    const roles = (rolesData ?? []).map((ur: any) => ur.roles);
    const permissions = (permissionsData ?? []).map((up: any) => up.permissions);

    return {
      id:          user.id,
      full_name:   user.full_name,
      email:       user.email,
      status:      user.status,
      created_at:  user.created_at,
      roles,
      permissions,
    };
  }
}
