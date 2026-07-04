import { Injectable } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { sanitizeSearchTerm } from '@common/utils/search.util';
import { normalizePagination } from '@common/utils/pagination.util';

@Injectable()
export class FindAllWorkersUseCase {
  constructor(private supabase: SupabaseService) {}

  async execute(
    organizationId: string,
    search?: string,
    status?: string,
    clientId?: string,
    clientLocationId?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const { from, to } = normalizePagination(page, limit);
    const safeSearch = sanitizeSearchTerm(search);

    let query = this.supabase
      .getClient()
      .from('workers')
      .select(
        `
      id, employee_code, full_name, document_number, status,
      clients!inner(id, name, code, organization_id),
      client_locations(id, name)
      `,
        { count: 'exact' },
      )
      .eq('clients.organization_id', organizationId)
      .order('full_name', { ascending: true });

    if (status) query = query.eq('status', status);
    if (clientId) query = query.eq('client_id', clientId);
    if (clientLocationId) query = query.eq('client_location_id', clientLocationId);
    if (safeSearch) {
      query = query.or(
        `full_name.ilike.%${safeSearch}%,document_number.ilike.%${safeSearch}%,employee_code.ilike.%${safeSearch}%`,
      );
    }

    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw new Error('No se pudo obtener el listado de trabajadores');

    return { items: data ?? [], total: count ?? 0 };
  }
}
