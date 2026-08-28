import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AuditService } from '@common/services/audit.service';
import { OrganizationScopeService } from '@common/services/organization-scope.service';
import { UpdateServiceOrderStatusDto } from '../dto/update-service-order-status.dto';

/**
 * Transiciones legales, gestionadas en aplicación (migración 004, sin
 * máquina de estados en DB). CANCELLED no está acá -- solo se llega vía
 * CancelServiceOrderUseCase, gateado por el permiso service_orders:delete.
 */
const LEGAL_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['RECEIVED'],
  RECEIVED: ['IN_PROCESS'],
  IN_PROCESS: ['QC_REVIEW'],
  QC_REVIEW: ['IN_PROCESS', 'COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

@Injectable()
export class UpdateServiceOrderStatusUseCase {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
    private readonly orgScope: OrganizationScopeService,
  ) {}

  async execute(
    orderId: string,
    dto: UpdateServiceOrderStatusDto,
    organizationId: string,
    requestingUserId: string,
  ) {
    const orgType = await this.orgScope.getOrganizationType(organizationId);
    if (orgType !== 'laboratory') {
      throw new ForbiddenException('Solo el laboratorio puede cambiar el estado de una orden');
    }

    const supabase = this.supabase.getClient();

    const { data: existing } = await supabase
      .from('service_orders')
      .select('id, status')
      .eq('id', orderId)
      .maybeSingle();

    if (!existing) throw new NotFoundException('Orden de servicio no encontrada');

    if (dto.status === existing.status) {
      throw new BadRequestException('La orden ya está en este estado');
    }

    const allowedNext = LEGAL_TRANSITIONS[existing.status] ?? [];
    if (!allowedNext.includes(dto.status)) {
      throw new BadRequestException(
        `No se puede pasar de '${existing.status}' a '${dto.status}'. ` +
          `Estados válidos: ${allowedNext.join(', ') || 'ninguno (estado terminal)'}`,
      );
    }

    const { data, error } = await supabase
      .from('service_orders')
      .update({ status: dto.status })
      .eq('id', orderId)
      .select('id, order_number, status')
      .single();

    if (error) throw new Error('No se pudo actualizar el estado de la orden');

    await this.audit.log({
      userId: requestingUserId,
      entityName: 'service_orders',
      entityId: orderId,
      action: 'STATUS_CHANGE',
      oldValues: { status: existing.status },
      newValues: { status: dto.status },
    });

    return data;
  }
}
