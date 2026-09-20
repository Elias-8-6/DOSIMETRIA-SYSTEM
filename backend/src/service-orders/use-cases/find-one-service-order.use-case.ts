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
        clients(id, code, name, address, phone, contact_name, contact_email, organization_id),
        service_order_items(
          id, requested_action, status,
          dosimeters(
            id, serial_number, internal_code, model, manufacturer,
            dosimeter_types(id, code, name, technology),
            dosimeter_assignments(
              id, status, assigned_at, returned_at,
              workers(id, full_name, document_number)
            )
          )
        )
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

    const enrichedItems = (data.service_order_items ?? []).map((item: any) => {
      const dosimeter = item.dosimeters;
      if (!dosimeter) return item;
      const assignments = dosimeter.dosimeter_assignments ?? [];
      const activeAssignment =
        assignments.find((a: any) => a.status === 'activo' || !a.returned_at) ||
        assignments[0];
      const assigned_worker = activeAssignment?.workers ?? null;
      return {
        ...item,
        dosimeters: {
          ...dosimeter,
          assigned_worker,
        },
      };
    });

    return {
      ...data,
      clients: client ? clientRest : null,
      service_order_items: enrichedItems,
    };
  }
}
