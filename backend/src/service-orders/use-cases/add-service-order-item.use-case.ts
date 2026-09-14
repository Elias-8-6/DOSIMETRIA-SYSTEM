import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AuditService } from '@common/services/audit.service';
import { OrganizationScopeService } from '@common/services/organization-scope.service';
import { CreateServiceOrderItemDto } from '../dto/create-service-order-item.dto';

@Injectable()
export class AddServiceOrderItemUseCase {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
    private readonly orgScope: OrganizationScopeService,
  ) {}

  async execute(
    orderId: string,
    dto: CreateServiceOrderItemDto,
    organizationId: string,
    requestingUserId: string,
  ) {
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
      throw new BadRequestException('Solo se pueden agregar ítems mientras la orden está PENDING');
    }

    const owned = await this.orgScope.isDosimeterOwnedByClient(dto.dosimeter_id, order.client_id);
    if (!owned) {
      throw new BadRequestException('El dosímetro no pertenece a este cliente');
    }

    const { data: newItem, error } = await supabase
      .from('service_order_items')
      .insert({
        service_order_id: orderId,
        dosimeter_id: dto.dosimeter_id,
        requested_action: dto.requested_action,
      })
      .select(
        'id, dosimeter_id, requested_action, status, dosimeters(id, serial_number, internal_code)',
      )
      .single();

    if (error || !newItem) {
      if (error?.code === '23505') {
        throw new ConflictException('Este dosímetro ya está incluido en la orden');
      }
      throw new Error('No se pudo agregar el ítem a la orden');
    }

    await this.audit.log({
      userId: requestingUserId,
      entityName: 'service_order_items',
      entityId: newItem.id,
      action: 'CREATE',
      newValues: { service_order_id: orderId, dosimeter_id: dto.dosimeter_id },
    });

    return newItem;
  }
}
