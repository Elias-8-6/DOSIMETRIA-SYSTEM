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

    if (error) throw new Error('No se pudo cancelar la orden de servicio');

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
