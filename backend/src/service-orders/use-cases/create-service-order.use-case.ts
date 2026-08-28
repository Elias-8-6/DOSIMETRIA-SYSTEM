import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AuditService } from '@common/services/audit.service';
import { OrganizationScopeService } from '@common/services/organization-scope.service';
import { CreateServiceOrderDto } from '../dto/create-service-order.dto';

const MAX_ORDER_NUMBER_ATTEMPTS = 3;

const ORDER_SELECT_FIELDS = `
  id, order_number, service_type, status, priority,
  requested_date, due_date, observations, created_at, created_by,
  clients(id, code, name)
`;

@Injectable()
export class CreateServiceOrderUseCase {
  private readonly logger = new Logger(CreateServiceOrderUseCase.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
    private readonly orgScope: OrganizationScopeService,
  ) {}

  async execute(dto: CreateServiceOrderDto, organizationId: string, requestingUserId: string) {
    const client = this.supabase.getClient();
    const orgType = await this.orgScope.getOrganizationType(organizationId);

    const { data: targetClient } = await client
      .from('clients')
      .select('id, organization_id')
      .eq('id', dto.client_id)
      .maybeSingle();

    if (!targetClient) throw new NotFoundException('Cliente no encontrado');

    if (orgType === 'client' && targetClient.organization_id !== organizationId) {
      throw new ForbiddenException('No puede crear órdenes de servicio para otro cliente');
    }

    for (const item of dto.items) {
      const owned = await this.orgScope.isDosimeterOwnedByClient(item.dosimeter_id, dto.client_id);
      if (!owned) {
        throw new BadRequestException(
          `El dosímetro ${item.dosimeter_id} no pertenece a este cliente`,
        );
      }
    }

    let order: Record<string, unknown> | null = null;
    let lastError: { code?: string; message: string } | null = null;

    for (let attempt = 1; attempt <= MAX_ORDER_NUMBER_ATTEMPTS && !order; attempt++) {
      const orderNumber = await this.generateOrderNumber(client);

      const { data, error } = await client
        .from('service_orders')
        .insert({
          client_id: dto.client_id,
          order_number: orderNumber,
          service_type: dto.service_type,
          requested_date: dto.requested_date ?? null,
          due_date: dto.due_date ?? null,
          observations: dto.observations ?? null,
          priority: dto.priority ?? 'normal',
          created_by: requestingUserId,
        })
        .select(ORDER_SELECT_FIELDS)
        .single();

      if (!error) {
        order = data;
        break;
      }

      lastError = error;
      if (error.code !== '23505') break;
    }

    if (!order) {
      this.logger.error('Error al crear la orden de servicio', lastError);
      throw new Error('No se pudo crear la orden de servicio');
    }

    const itemsToInsert = dto.items.map((item) => ({
      service_order_id: order!.id,
      dosimeter_id: item.dosimeter_id,
      requested_action: item.requested_action,
    }));

    const { data: insertedItems, error: itemsError } = await client
      .from('service_order_items')
      .insert(itemsToInsert)
      .select('id, dosimeter_id, requested_action, status, dosimeters(id, serial_number, internal_code)');

    if (itemsError) {
      this.logger.error('Error al crear los ítems, revirtiendo la orden', itemsError);
      await client.from('service_orders').delete().eq('id', order.id);
      throw new Error('No se pudieron registrar los dosímetros de la orden');
    }

    await this.audit.log({
      userId: requestingUserId,
      entityName: 'service_orders',
      entityId: order.id as string,
      action: 'CREATE',
      newValues: {
        order_number: order.order_number,
        client_id: dto.client_id,
        items_count: dto.items.length,
      },
    });

    return { ...order, service_order_items: insertedItems ?? [] };
  }

  private async generateOrderNumber(
    supabase: ReturnType<SupabaseService['getClient']>,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `OS-${year}-`;

    const { data, error } = await supabase
      .from('service_orders')
      .select('order_number')
      .ilike('order_number', `${prefix}%`)
      .order('order_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error('No se pudo calcular el siguiente número de orden');

    const lastSeq = data ? parseInt(data.order_number.slice(prefix.length), 10) : 0;
    const nextSeq = lastSeq + 1;
    return `${prefix}${String(nextSeq).padStart(5, '0')}`;
  }
}
