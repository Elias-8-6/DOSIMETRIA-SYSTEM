import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AuditService } from '@common/services/audit.service';
import { OrganizationScopeService } from '@common/services/organization-scope.service';

@Injectable()
export class RemoveServiceOrderItemUseCase {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
    private readonly orgScope: OrganizationScopeService,
  ) {}

  async execute(orderId: string, itemId: string, organizationId: string, requestingUserId: string) {
    const supabase = this.supabase.getClient();

    const { data: order } = await supabase
      .from('service_orders')
      .select('id, client_id, status')
      .eq('id', orderId)
      .maybeSingle();

    if (!order) throw new NotFoundException('Orden de servicio no encontrada');

    const orgType = await this.orgScope.getOrganizationType(organizationId);
    if (orgType === 'client') {
      const ownClientIds = await this.orgScope.getOwnClientIds(organizationId);
      if (!ownClientIds.includes(order.client_id)) {
        throw new NotFoundException('Orden de servicio no encontrada');
      }
    }

    if (order.status !== 'PENDING') {
      throw new BadRequestException('Solo se pueden quitar ítems mientras la orden está PENDING');
    }

    const { data: item } = await supabase
      .from('service_order_items')
      .select('id')
      .eq('id', itemId)
      .eq('service_order_id', orderId)
      .maybeSingle();

    if (!item) throw new NotFoundException('Ítem no encontrado en esta orden');

    const { data: remainingItems } = await supabase
      .from('service_order_items')
      .select('id')
      .eq('service_order_id', orderId);

    if ((remainingItems?.length ?? 0) <= 1) {
      throw new BadRequestException('La orden debe tener al menos un ítem');
    }

    const { error } = await supabase.from('service_order_items').delete().eq('id', itemId);
    if (error) throw new Error('No se pudo quitar el ítem de la orden');

    await this.audit.log({
      userId: requestingUserId,
      entityName: 'service_order_items',
      entityId: itemId,
      action: 'DELETE',
      oldValues: { service_order_id: orderId },
    });

    return { id: itemId, removed: true };
  }
}
