import { Injectable } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { sanitizeSearchTerm } from '@common/utils/search.util';
import { normalizePagination } from '@common/utils/pagination.util';

@Injectable()
export class FindAllUsersUseCase {
  constructor(private readonly supabase: SupabaseService) {}

  async execute(
    organizationId: string,
    search?: string,
    status?: string,
    page?: number | string,
    limit?: number | string,
  ) {
    const client = this.supabase.getClient();
    const { from, to } = normalizePagination(page, limit);
    const safeSearch = sanitizeSearchTerm(search);

    let query = client
      .from('users')
      .select(
        `id, full_name, email, status, created_at,
             user_roles( roles(code, name) )`,
        { count: 'exact' },
      )
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (safeSearch) {
      query = query.or(`full_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    query = query.range(from, to);

    const { data: users, error, count } = await query;

    if (error) {
      throw new Error('No se pudo obtener el listado de usuarios');
    }

    return {
      items: (users ?? []).map((user) => ({
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        status: user.status,
        created_at: user.created_at,
        roles: (user.user_roles as any[]).map((ur) => ur.roles),
      })),
      total: count ?? 0,
    };
  }
}
