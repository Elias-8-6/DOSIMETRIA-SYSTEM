import { Injectable } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';

@Injectable()
export class FindAllUsersUseCase {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * execute()
   *
   * Retorna todos los usuarios de la organización del admin autenticado.
   * Nunca retorna password_hash.
   * Incluye los roles de cada usuario para mostrar en el listado.
   *
   * @param organizationId Organización del admin — viene del JWT
   */
  async execute(
      organizationId: string,
      search?: string,
      status?: string
  ) {
    const client = this.supabase.getClient();


    let query = client
        .from('users')
        .select(`id, full_name, email, status, created_at,
             user_roles( roles(code, name) )`)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

    // Filtro de búsqueda por nombre o email
    if (search) {
      query = query.or(
          `full_name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    // Filtro por status
    if (status) {
      query = query.eq('status', status);
    }
    const { data: users, error } = await query;

    if (error) {
      throw new Error('No se pudo obtener el listado de usuarios');
    }

    // Transformar la estructura anidada de roles a un array plano
    return (users ?? []).map((user) => ({
      id:         user.id,
      full_name:  user.full_name,
      email:      user.email,
      status:     user.status,
      created_at: user.created_at,
      roles:      (user.user_roles as any[]).map((ur) => ur.roles),
    }));
  }
}
