import { Injectable } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { OrganizationScopeService } from '@common/services/organization-scope.service';
import { sanitizeSearchTerm } from '@common/utils/search.util';
import { normalizePagination } from '@common/utils/pagination.util';

const SELECT_FIELDS = `
  id, order_number, service_type, status, priority,
  requested_date, due_date, created_at,
  clients(id, code, name),
  service_order_items(count)
`;

@Injectable()
export class FindAllServiceOrdersUseCase {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly orgScope: OrganizationScopeService,
  ) {}

  async execute(
    organizationId: string,
    search?: string,
    status?: string,
    serviceType?: string,
    priority?: string,
    clientId?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const orgType = await this.orgScope.getOrganizationType(organizationId);

    let allowedClientIds: string[] | null = null;
    if (orgType === 'client') {
      allowedClientIds = await this.orgScope.getOwnClientIds(organizationId);
      if (allowedClientIds.length === 0) {
        return { items: [], total: 0 };
      }
    }

    const { from, to } = normalizePagination(page, limit);
    const safeSearch = sanitizeSearchTerm(search);

    let query = this.supabase
      .getClient()
      .from('service_orders')
      .select(SELECT_FIELDS, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (allowedClientIds) query = query.in('client_id', allowedClientIds);
    if (clientId) query = query.eq('client_id', clientId);
    if (status) query = query.eq('status', status);
    if (serviceType) query = query.eq('service_type', serviceType);
    if (priority) query = query.eq('priority', priority);
    if (safeSearch) query = query.ilike('order_number', `%${safeSearch}%`);

    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw new Error('No se pudo obtener el listado de órdenes de servicio');

    const items = (data ?? []).map((row: Record<string, unknown>) => {
      const itemRows = row.service_order_items as { count: number }[] | undefined;
      const itemsCount = itemRows?.[0]?.count ?? 0;
      const { service_order_items: _items, ...rest } = row;
      return { ...rest, items_count: itemsCount };
    });

    return {
      items,
      total: count ?? 0,
    };
  }
}
