import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AuditService } from '@common/services/audit.service';
import { OrganizationScopeService } from '@common/services/organization-scope.service';
import { CreateReceptionDto } from '../dto/create-reception.dto';

const MAX_RECEPTION_CODE_ATTEMPTS = 3;

const RECEPTION_SELECT_FIELDS = `
  id, reception_code, service_order_id, received_by, received_at,
  packaging_condition, observations,
  users(id, full_name, email),
  service_orders(id, order_number, status, clients(id, code, name))
`;

@Injectable()
export class CreateReceptionUseCase {
  private readonly logger = new Logger(CreateReceptionUseCase.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
    private readonly orgScope: OrganizationScopeService,
  ) {}

  async execute(dto: CreateReceptionDto, organizationId: string, requestingUserId: string) {
    const orgType = await this.orgScope.getOrganizationType(organizationId);
    if (orgType !== 'laboratory') {
      throw new ForbiddenException('Solo el laboratorio puede registrar recepciones físicas');
    }

    const client = this.supabase.getClient();

    // 1. Verificar existencia y estado de la orden de servicio
    const { data: order, error: orderError } = await client
      .from('service_orders')
      .select('id, order_number, status, client_id, clients(id, name, organization_id)')
      .eq('id', dto.service_order_id)
      .maybeSingle();

    if (orderError || !order) {
      throw new NotFoundException('Orden de servicio no encontrada');
    }

    if (order.status !== 'PENDING') {
      throw new BadRequestException(
        `Solo se pueden recepcionar órdenes en estado 'PENDING'. La orden actual está en estado '${order.status}'`,
      );
    }

    // 2. Obtener los ítems asociados a la orden
    const { data: orderItems, error: itemsFetchError } = await client
      .from('service_order_items')
      .select('id, dosimeter_id, status, requested_action')
      .eq('service_order_id', order.id);

    if (itemsFetchError || !orderItems || orderItems.length === 0) {
      throw new BadRequestException('La orden de servicio no contiene dosímetros asociados');
    }

    const orderDosimeterIds = new Set(orderItems.map((item) => item.dosimeter_id));

    // 3. Validar ítems del DTO
    const seenDosimeters = new Set<string>();
    for (const item of dto.items) {
      if (seenDosimeters.has(item.dosimeter_id)) {
        throw new BadRequestException(
          `El dosímetro ${item.dosimeter_id} está duplicado en la recepción`,
        );
      }
      seenDosimeters.add(item.dosimeter_id);

      if (!orderDosimeterIds.has(item.dosimeter_id)) {
        throw new BadRequestException(
          `El dosímetro ${item.dosimeter_id} no pertenece a la orden de servicio ${order.order_number}`,
        );
      }
    }

    // 4. Obtener IDs de estado de dosímetros ('EN_LAB', 'INCIDENTE')
    const { data: statuses, error: statusError } = await client
      .from('dosimeter_statuses')
      .select('id, code')
      .in('code', ['EN_LAB', 'INCIDENTE']);

    if (statusError || !statuses) {
      throw new Error('No se pudieron obtener los catálogos de estado de dosímetros');
    }

    const enLabStatusId = statuses.find((s) => s.code === 'EN_LAB')?.id;
    const incidentStatusId = statuses.find((s) => s.code === 'INCIDENTE')?.id;

    if (!enLabStatusId || !incidentStatusId) {
      throw new Error('Faltan estados requeridos (EN_LAB / INCIDENTE) en dosimeter_statuses');
    }

    // 5. Insertar recepción con generación de código REC-YYYY-NNNNN
    let reception: Record<string, unknown> | null = null;
    let lastError: { code?: string; message: string } | null = null;

    for (let attempt = 1; attempt <= MAX_RECEPTION_CODE_ATTEMPTS && !reception; attempt++) {
      const receptionCode = await this.generateReceptionCode(client);

      const { data, error } = await client
        .from('receptions')
        .insert({
          service_order_id: dto.service_order_id,
          received_by: requestingUserId,
          reception_code: receptionCode,
          packaging_condition: dto.packaging_condition,
          observations: dto.observations ?? null,
        })
        .select(RECEPTION_SELECT_FIELDS)
        .single();

      if (!error) {
        reception = data;
        break;
      }

      lastError = error;
      if (error.code !== '23505') break;
    }

    if (!reception) {
      this.logger.error('Error al registrar recepción física:', lastError);
      throw new Error('No se pudo registrar la recepción física en el laboratorio');
    }

    // 6. Insertar reception_items
    const receptionItemsToInsert = dto.items.map((item) => ({
      reception_id: reception!.id,
      dosimeter_id: item.dosimeter_id,
      received_condition: item.received_condition,
      sealed: item.sealed ?? true,
      contaminated: item.contaminated ?? false,
      observations: item.observations ?? null,
      condition_photo_url: item.condition_photo_url ?? null,
    }));

    const { data: insertedItems, error: recItemsError } = await client
      .from('reception_items')
      .insert(receptionItemsToInsert)
      .select(`
        id, dosimeter_id, received_condition, sealed, contaminated,
        observations, condition_photo_url,
        dosimeters(id, serial_number, internal_code, model, manufacturer)
      `);

    if (recItemsError) {
      this.logger.error('Error al insertar ítems de recepción, revirtiendo recepción:', recItemsError);
      await client.from('receptions').delete().eq('id', reception.id);
      throw new Error('No se pudieron registrar los ítems de recepción');
    }

    // 7. Procesar cada ítem: actualizar estados e incident_reports si corresponde
    for (const item of dto.items) {
      const isIncident =
        item.contaminated === true ||
        item.sealed === false ||
        ['danado_fisico', 'sello_roto', 'contaminado', 'perdido'].includes(item.received_condition);

      const orderItem = orderItems.find((oi) => oi.dosimeter_id === item.dosimeter_id);

      if (isIncident) {
        // Disparar reporte de incidente ISO 17025
        let incidentType: string = 'otro';
        let severity: string = 'media';

        if (item.contaminated || item.received_condition === 'contaminado') {
          incidentType = 'contaminacion';
          severity = 'critica';
        } else if (item.sealed === false || item.received_condition === 'sello_roto') {
          incidentType = 'sello_roto';
          severity = 'media';
        } else if (item.received_condition === 'perdido') {
          incidentType = 'perdida_dosimetro';
          severity = 'alta';
        }

        const description = `Incidente en recepción (${reception.reception_code}): Dosímetro reportado con ${item.received_condition}. Sellado: ${item.sealed ? 'Sí' : 'No'}. Contaminado: ${item.contaminated ? 'Sí' : 'No'}.${item.observations ? ` Observaciones: ${item.observations}` : ''}`;

        const { error: incError } = await client.from('incident_reports').insert({
          reported_by: requestingUserId,
          incident_type: incidentType,
          severity: severity,
          status: 'ABIERTO',
          description: description,
          dosimeter_id: item.dosimeter_id,
        });

        if (incError) {
          this.logger.warn(`Nota al registrar incident_report para dosímetro ${item.dosimeter_id}:`, incError);
        }

        // Actualizar dosímetro a INCIDENTE
        await client
          .from('dosimeters')
          .update({ status_id: incidentStatusId })
          .eq('id', item.dosimeter_id);

        // Actualizar service_order_item a INCIDENT
        if (orderItem) {
          await client
            .from('service_order_items')
            .update({ status: 'INCIDENT' })
            .eq('id', orderItem.id);
        }
      } else {
        // Normal: Actualizar dosímetro a EN_LAB
        await client
          .from('dosimeters')
          .update({ status_id: enLabStatusId })
          .eq('id', item.dosimeter_id);

        // Actualizar service_order_item a RECEIVED
        if (orderItem) {
          await client
            .from('service_order_items')
            .update({ status: 'RECEIVED' })
            .eq('id', orderItem.id);
        }
      }
    }

    // 8. Actualizar orden de servicio a RECEIVED si estaba PENDING
    if (order.status === 'PENDING') {
      await client
        .from('service_orders')
        .update({ status: 'RECEIVED' })
        .eq('id', order.id);

      await this.audit.log({
        userId: requestingUserId,
        entityName: 'service_orders',
        entityId: order.id,
        action: 'STATUS_CHANGE',
        oldValues: { status: 'PENDING' },
        newValues: { status: 'RECEIVED' },
      });
    }

    // 9. Registro de auditoría ISO 17025 para la recepción
    await this.audit.log({
      userId: requestingUserId,
      entityName: 'receptions',
      entityId: reception.id as string,
      action: 'CREATE',
      newValues: {
        reception_code: reception.reception_code,
        service_order_id: dto.service_order_id,
        packaging_condition: dto.packaging_condition,
        items_count: dto.items.length,
      },
    });

    return {
      ...reception,
      reception_items: insertedItems ?? [],
    } as Record<string, any>;
  }

  private async generateReceptionCode(
    supabase: ReturnType<SupabaseService['getClient']>,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `REC-${year}-`;

    const { data, error } = await supabase
      .from('receptions')
      .select('reception_code')
      .ilike('reception_code', `${prefix}%`)
      .order('reception_code', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error('No se pudo calcular el siguiente código de recepción');
    }

    const lastSeq = data ? parseInt(data.reception_code.slice(prefix.length), 10) : 0;
    const nextSeq = lastSeq + 1;
    return `${prefix}${String(nextSeq).padStart(5, '0')}`;
  }
}
