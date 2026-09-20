import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { OrganizationScopeService } from '@common/services/organization-scope.service';

const RECEPTION_DETAIL_FIELDS = `
  id, reception_code, service_order_id, received_at,
  packaging_condition, observations,
  users(id, full_name, email),
  service_orders(
    id, order_number, status, service_type, priority,
    clients(id, code, name, organization_id)
  ),
  reception_items(
    id, dosimeter_id, received_condition, sealed, contaminated,
    observations, condition_photo_url,
    dosimeters(
      id, serial_number, internal_code, model, manufacturer, photo_url,
      dosimeter_types(id, name, technology)
    )
  )
`;

@Injectable()
export class FindOneReceptionUseCase {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly orgScope: OrganizationScopeService,
  ) {}

  async execute(receptionId: string, organizationId: string) {
    const orgType = await this.orgScope.getOrganizationType(organizationId);

    const { data: reception, error } = await this.supabase
      .getClient()
      .from('receptions')
      .select(RECEPTION_DETAIL_FIELDS)
      .eq('id', receptionId)
      .maybeSingle();

    if (error) {
      throw new Error('No se pudo obtener el detalle de la recepción');
    }

    if (!reception) {
      throw new NotFoundException('Recepción no encontrada');
    }

    const order = reception.service_orders as unknown as {
      clients?: { organization_id?: string } | null;
    } | null;

    if (orgType === 'client' && order?.clients?.organization_id !== organizationId) {
      throw new ForbiddenException('No tiene acceso a esta recepción');
    }

    // Consultar incident_reports asociados a los dosímetros de esta recepción
    const dosimeterIds = (
      (reception.reception_items as unknown as Array<{ dosimeter_id: string }>) ?? []
    ).map((item) => item.dosimeter_id);

    let incidents: Array<Record<string, unknown>> = [];
    if (dosimeterIds.length > 0) {
      const { data: incidentData } = await this.supabase
        .getClient()
        .from('incident_reports')
        .select('id, dosimeter_id, incident_type, severity, status, description, reported_at')
        .in('dosimeter_id', dosimeterIds);

      incidents = incidentData ?? [];
    }

    // Vincular incidentes a los reception_items
    const enrichedItems = (
      (reception.reception_items as unknown as Array<Record<string, unknown>>) ?? []
    ).map((item) => {
      const relatedIncidents = incidents.filter((inc) => inc.dosimeter_id === item.dosimeter_id);
      return {
        ...item,
        incident_reports: relatedIncidents,
      };
    });

    return {
      ...reception,
      reception_items: enrichedItems,
    };
  }
}
