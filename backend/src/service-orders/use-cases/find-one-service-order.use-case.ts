import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { OrganizationScopeService } from '@common/services/organization-scope.service';

@Injectable()
export class FindOneServiceOrderUseCase {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly orgScope: OrganizationScopeService,
  ) {}

  async execute(orderId: string, organizationId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('service_orders')
      .select(
        `
        id, order_number, service_type, status, priority,
        requested_date, due_date, observations, created_at, created_by,
        clients(id, code, name, contact_name, contact_email, organization_id),
        service_order_items(id, requested_action, status, dosimeters(id, serial_number, internal_code))
      `,
      )
      .eq('id', orderId)
      .maybeSingle();

    if (error) throw new Error('Error al obtener la orden de servicio');
    if (!data) throw new NotFoundException('Orden de servicio no encontrada');

    const orgType = await this.orgScope.getOrganizationType(organizationId);
    const client = data.clients as unknown as { organization_id: string } | null;

    if (orgType === 'client' && client?.organization_id !== organizationId) {
      throw new NotFoundException('Orden de servicio no encontrada');
    }

    // organization_id es un dato interno para resolver el scoping, no debe
    // filtrarse en la respuesta al cliente.
    const { organization_id: _orgId, ...clientRest } = client ?? { organization_id: undefined };

    return { ...data, clients: client ? clientRest : null };
  }
}
