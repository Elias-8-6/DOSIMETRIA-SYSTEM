import { Injectable } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { sanitizeSearchTerm } from '@common/utils/search.util';
import { normalizePagination } from '@common/utils/pagination.util';

@Injectable()
export class FindAllClientsUseCase {
  constructor(private readonly supabase: SupabaseService) {}

  async execute(
    organizationId: string,
    search?: string,
    status?: string,
    clientType?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const { from, to } = normalizePagination(page, limit);
    const safeSearch = sanitizeSearchTerm(search);

    let query = this.supabase
      .getClient()
      .from('clients')
      .select(
        `
      id, code, name, contact_name, contact_email,
      phone, address, website, client_type,
      contract_start_date, contract_end_date,
      status, created_at,
      client_locations(count)
      `,
        { count: 'exact' },
      )
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });

    if (status) query = query.eq('status', status);
    if (clientType) query = query.eq('client_type', clientType);
    if (safeSearch) {
      query = query.or(
        `name.ilike.%${safeSearch}%,code.ilike.%${safeSearch}%,contact_name.ilike.%${safeSearch}%`,
      );
    }

    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw new Error('No se pudo obtener el listado de clientes');

    const items = (data ?? []).map((row: Record<string, unknown>) => {
      const locationRows = row.client_locations as { count: number }[] | undefined;
      const locationsCount = locationRows?.[0]?.count ?? 0;
      const { client_locations: _locations, ...rest } = row;
      return {
        ...rest,
        locations_count: locationsCount,
        // Compatibilidad con UI que usa .length
        client_locations: Array.from({ length: locationsCount }),
      };
    });

    return {
      items,
      total: count ?? 0,
    };
  }
}
