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
        // El listado no trae las sedes completas (solo el conteo, para no
        // pagar el JOIN completo). client_locations va vacío a propósito —
        // quien necesite las sedes reales de un cliente debe pedir el
        // detalle (GET /clients/:id). Antes se rellenaba con
        // Array.from({length: N}) para que .length siguiera funcionando,
        // pero eso producía elementos undefined/null que rompían a
        // cualquier consumidor que iterara el array esperando objetos
        // reales (ej. el selector de sede en "Nuevo trabajador").
        client_locations: [],
      };
    });

    return {
      items,
      total: count ?? 0,
    };
  }
}
