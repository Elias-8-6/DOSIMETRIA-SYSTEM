import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AuditService } from '@common/services/audit.service';
import { OrganizationScopeService } from '@common/services/organization-scope.service';

const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED'];

@Injectable()
export class CancelServiceOrderUseCase {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
    private readonly orgScope: OrganizationScopeService,
  ) {}

  async execute(orderId: string, organizationId: string, requestingUserId: string) {
    const supabase = this.supabase.getClient();

    const { data: existing } = await supabase
      .from('service_orders')
      .select('id, client_id, status')
      .eq('id', orderId)
      .maybeSingle();

    if (!existing) throw new NotFoundException('Orden de servicio no encontrada');

    const orgType = await this.orgScope.getOrganizationType(organizationId);
    if (orgType === 'client') {
      const ownClientIds = await this.orgScope.getOwnClientIds(organizationId);
      if (!ownClientIds.includes(existing.client_id)) {
        throw new NotFoundException('Orden de servicio no encontrada');
      }
    }

    if (TERMINAL_STATUSES.includes(existing.status)) {
      throw new BadRequestException('La orden ya está en un estado terminal y no puede cancelarse');
    }

    const { data, error } = await supabase
      .from('service_orders')
      .update({ status: 'CANCELLED' })
      .eq('id', orderId)
      .select('id, order_number, status')
      .single();

    // Si los dosímetros estaban en EN_TRANSITO por esta orden, revertirlos a ASIGNADO
    const { data: items } = await supabase
      .from('service_order_items')
      .select('dosimeter_id')
      .eq('service_order_id', orderId);

    const dosimeterIds = (items ?? []).map((i: any) => i.dosimeter_id).filter(Boolean);

    if (dosimeterIds.length > 0) {
      const { data: statuses } = await supabase
        .from('dosimeter_statuses')
        .select('id, code')
        .in('code', ['ASIGNADO', 'EN_TRANSITO']);

      const asignadoId = statuses?.find((s) => s.code === 'ASIGNADO')?.id;
      const enTransitoId = statuses?.find((s) => s.code === 'EN_TRANSITO')?.id;

      if (asignadoId && enTransitoId) {
        await supabase
          .from('dosimeters')
          .update({ status_id: asignadoId })
          .in('id', dosimeterIds)
          .eq('status_id', enTransitoId);

        for (const dosId of dosimeterIds) {
          await this.audit.log({
            userId: requestingUserId,
            entityName: 'dosimeters',
            entityId: dosId,
            action: 'STATUS_CHANGE',
            oldValues: { status: 'EN_TRANSITO' },
            newValues: {
              status: 'ASIGNADO',
              reason: 'SERVICE_ORDER_CANCELLED',
              service_order_id: orderId,
            },
          });
        }
      }
    }

    await this.audit.log({
      userId: requestingUserId,
      entityName: 'service_orders',
      entityId: orderId,
      action: 'STATUS_CHANGE',
      oldValues: { status: existing.status },
      newValues: { status: 'CANCELLED' },
    });

    return data;
  }
}
