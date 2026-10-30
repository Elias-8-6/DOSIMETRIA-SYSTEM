import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AuditService } from '@common/services/audit.service';
import { CreateDispatchGuideDto } from '../dto/create-dispatch-guide.dto';

@Injectable()
export class CreateDispatchGuideUseCase {
  private readonly logger = new Logger(CreateDispatchGuideUseCase.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  async execute(serviceOrderId: string, dto: CreateDispatchGuideDto, requestingUserId: string) {
    const supabase = this.supabase.getClient();

    // 1. Validar que la orden de servicio exista
    const { data: order, error: orderErr } = await supabase
      .from('service_orders')
      .select('id, order_number, status, client_id')
      .eq('id', serviceOrderId)
      .maybeSingle();

    if (orderErr || !order) {
      throw new NotFoundException('Orden de servicio no encontrada');
    }

    if (order.status === 'CANCELLED' || order.status === 'COMPLETED') {
      throw new ConflictException(
        `No se puede emitir guía de entrega para una orden en estado '${order.status}'`,
      );
    }

    // 2. Verificar que no exista ya una guía de entrega activa para esta orden
    const { data: existingGuide } = await supabase
      .from('dispatch_guides')
      .select('id, guide_number, status')
      .eq('service_order_id', serviceOrderId)
      .neq('status', 'anulada')
      .maybeSingle();

    if (existingGuide) {
      throw new ConflictException(
        `Ya existe una hoja de entrega activa ('${existingGuide.guide_number}') para esta orden`,
      );
    }

    // 3. Validar dosímetro viajero si se suministra
    if (dto.traveler_holder_id) {
      const { data: traveler, error: travErr } = await supabase
        .from('holder_dosimeters')
        .select('id, barcode, current_condition')
        .eq('id', dto.traveler_holder_id)
        .maybeSingle();

      if (travErr || !traveler) {
        throw new NotFoundException('Dosímetro viajero no encontrado');
      }

      if (['danado_grave', 'contaminado', 'perdido'].includes(traveler.current_condition)) {
        throw new BadRequestException(
          `El dosímetro viajero seleccionado presenta condición crítica (${traveler.current_condition})`,
        );
      }
    }

    // 4. Generar correlativo formal HE-YYYY-NNNNN
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('dispatch_guides')
      .select('id', { count: 'exact', head: true });

    const seq = String((count ?? 0) + 1).padStart(5, '0');
    const guideNumber = `HE-${year}-${seq}`;

    // 5. Crear cabecera de la Hoja de Entrega
    const { data: dispatchGuide, error: guideErr } = await supabase
      .from('dispatch_guides')
      .insert({
        service_order_id: serviceOrderId,
        guide_number: guideNumber,
        dispatched_at: dto.dispatched_at ?? new Date().toISOString(),
        dispatched_by: requestingUserId,
        carrier_name: dto.carrier_name ?? null,
        driver_name: dto.driver_name ?? null,
        driver_document: dto.driver_document ?? null,
        traveler_holder_id: dto.traveler_holder_id ?? null,
        status: 'emitida',
        observations: dto.observations ?? null,
      })
      .select()
      .single();

    if (guideErr || !dispatchGuide) {
      this.logger.error('Error al emitir hoja de entrega:', guideErr);
      throw new Error(`No se pudo emitir la hoja de entrega: ${guideErr?.message}`);
    }

    // 6. Insertar items despachados
    const itemsToInsert = dto.items.map((item) => ({
      dispatch_guide_id: dispatchGuide.id,
      holder_id: item.holder_id ?? null,
      dosimeter_id: item.dosimeter_id ?? null,
      worker_id: item.worker_id ?? null,
      target_location: item.target_location ?? null,
      notes: item.notes ?? null,
    }));

    const { error: itemsErr } = await supabase
      .from('dispatch_guide_items')
      .insert(itemsToInsert);

    if (itemsErr) {
      this.logger.error('Error al insertar items de entrega:', itemsErr);
      throw new Error(`Error al registrar dosímetros despachados: ${itemsErr.message}`);
    }

    // 7. Actualizar estado de los portadosímetros a 'en_campo'
    const holderIds = dto.items
      .map((i) => i.holder_id)
      .filter((id): id is string => Boolean(id));

    if (dto.traveler_holder_id) {
      holderIds.push(dto.traveler_holder_id);
    }

    if (holderIds.length > 0) {
      await supabase
        .from('holder_dosimeters')
        .update({ status: 'en_campo' })
        .in('id', holderIds);
    }

    // 8. Si la orden estaba PENDING, actualizarla a IN_PROCESS
    if (order.status === 'PENDING') {
      await supabase
        .from('service_orders')
        .update({ status: 'IN_PROCESS' })
        .eq('id', serviceOrderId);
    }

    await this.audit.log({
      userId: requestingUserId,
      entityName: 'dispatch_guides',
      entityId: dispatchGuide.id,
      action: 'CREATE',
      newValues: {
        guide_number: dispatchGuide.guide_number,
        service_order_id: serviceOrderId,
        total_items: dto.items.length,
        has_traveler: Boolean(dto.traveler_holder_id),
      },
    });

    return {
      message: 'Hoja de Entrega emitida exitosamente',
      dispatch_guide: dispatchGuide,
      total_items: dto.items.length,
    };
  }
}
