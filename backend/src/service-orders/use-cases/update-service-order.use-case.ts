import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AuditService } from '@common/services/audit.service';
import { OrganizationScopeService } from '@common/services/organization-scope.service';
import { UpdateServiceOrderDto } from '../dto/update-service-order.dto';

const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED'];

@Injectable()
export class UpdateServiceOrderUseCase {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
    private readonly orgScope: OrganizationScopeService,
  ) {}

  async execute(
    orderId: string,
    dto: UpdateServiceOrderDto,
    organizationId: string,
    requestingUserId: string,
  ) {
    const orgType = await this.orgScope.getOrganizationType(organizationId);
    if (orgType !== 'laboratory') {
      throw new ForbiddenException('Solo el laboratorio puede editar órdenes de servicio');
    }

    const supabase = this.supabase.getClient();

    const { data: existing } = await supabase
      .from('service_orders')
      .select('id, status, due_date, observations, priority')
      .eq('id', orderId)
      .maybeSingle();

    if (!existing) throw new NotFoundException('Orden de servicio no encontrada');

    if (TERMINAL_STATUSES.includes(existing.status)) {
      throw new ForbiddenException('No se puede editar una orden en estado terminal');
    }

    const { data, error } = await supabase
      .from('service_orders')
      .update({
        ...(dto.due_date !== undefined && { due_date: dto.due_date }),
        ...(dto.observations !== undefined && { observations: dto.observations }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
      })
      .eq('id', orderId)
      .select('id, order_number, due_date, observations, priority')
      .single();

    if (error) throw new Error('No se pudo actualizar la orden de servicio');

    await this.audit.log({
      userId: requestingUserId,
      entityName: 'service_orders',
      entityId: orderId,
      action: 'UPDATE',
      oldValues: {
        due_date: existing.due_date,
        observations: existing.observations,
        priority: existing.priority,
      },
      newValues: {
        due_date: data.due_date,
        observations: data.observations,
        priority: data.priority,
      },
    });

    return data;
  }
}
