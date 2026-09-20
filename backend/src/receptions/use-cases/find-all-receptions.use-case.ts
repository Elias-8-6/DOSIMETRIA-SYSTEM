import { Injectable } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { OrganizationScopeService } from '@common/services/organization-scope.service';
import { sanitizeSearchTerm } from '@common/utils/search.util';
import { normalizePagination } from '@common/utils/pagination.util';

const RECEPTION_LIST_FIELDS = `
  id, reception_code, service_order_id, received_at,
  packaging_condition, observations,
  users(id, full_name, email),
  service_orders!inner(id, order_number, status, client_id, clients!inner(id, code, name, organization_id)),
  reception_items(count)
`;

@Injectable()
export class FindAllReceptionsUseCase {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly orgScope: OrganizationScopeService,
  ) {}

  async execute(
    organizationId: string,
    search?: string,
    packagingCondition?: string,
    serviceOrderId?: string,
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
      .from('receptions')
      .select(RECEPTION_LIST_FIELDS, { count: 'exact' })
      .order('received_at', { ascending: false });

    if (allowedClientIds) {
      query = query.in('service_orders.client_id', allowedClientIds);
    }
    if (clientId) {
      query = query.eq('service_orders.client_id', clientId);
    }
    if (serviceOrderId) {
      query = query.eq('service_order_id', serviceOrderId);
    }
    if (packagingCondition) {
      query = query.eq('packaging_condition', packagingCondition);
    }
    if (safeSearch) {
      query = query.or(`reception_code.ilike.%${safeSearch}%,observations.ilike.%${safeSearch}%`);
    }

    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw new Error('No se pudo obtener el listado de recepciones');
    }

    const items = (data ?? []).map((row: Record<string, unknown>) => {
      const itemRows = row.reception_items as { count: number }[] | undefined;
      const itemsCount = itemRows?.[0]?.count ?? 0;
      const { reception_items: _items, ...rest } = row;
      return { ...rest, items_count: itemsCount } as Record<string, any>;
    });

    return {
      items,
      total: count ?? 0,
    };
  }
}
