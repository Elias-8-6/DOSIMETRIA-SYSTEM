import { ForbiddenException, Injectable } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { OrganizationScopeService } from '@common/services/organization-scope.service';

const PENDING_ORDERS_SELECT_FIELDS = `
  id, order_number, service_type, status, priority, requested_date, due_date,
  clients(id, code, name),
  service_order_items(
    id, dosimeter_id, requested_action, status,
    dosimeters(
      id, serial_number, internal_code, model, manufacturer, photo_url,
      dosimeter_types(id, code, name, technology)
    )
  )
`;

@Injectable()
export class GetPendingOrdersForReceptionUseCase {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly orgScope: OrganizationScopeService,
  ) {}

  async execute(organizationId: string, search?: string) {
    const orgType = await this.orgScope.getOrganizationType(organizationId);
    if (orgType !== 'laboratory') {
      throw new ForbiddenException('Solo el personal de laboratorio puede consultar órdenes pendientes de recepción');
    }

    let query = this.supabase
      .getClient()
      .from('service_orders')
      .select(PENDING_ORDERS_SELECT_FIELDS)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('order_number', `%${search.trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error('No se pudieron obtener las órdenes de servicio pendientes');
    }

    return data ?? [];
  }
}
