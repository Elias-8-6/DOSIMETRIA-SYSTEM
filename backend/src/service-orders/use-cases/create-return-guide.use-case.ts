import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AuditService } from '@common/services/audit.service';
import { CreateReturnGuideDto } from '../dto/create-return-guide.dto';

@Injectable()
export class CreateReturnGuideUseCase {
  private readonly logger = new Logger(CreateReturnGuideUseCase.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  async execute(serviceOrderId: string, dto: CreateReturnGuideDto, requestingUserId: string) {
    const supabase = this.supabase.getClient();

    // 1. Validar orden de servicio
    const { data: order, error: orderErr } = await supabase
      .from('service_orders')
      .select('id, order_number, status')
      .eq('id', serviceOrderId)
      .maybeSingle();

    if (orderErr || !order) {
      throw new NotFoundException('Orden de servicio no encontrada');
    }

    if (order.status === 'CANCELLED') {
      throw new ConflictException('No se puede registrar devolución para una orden cancelada');
    }

    // 2. Generar correlativo formal HD-YYYY-NNNNN
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('return_guides')
      .select('id', { count: 'exact', head: true });

    const seq = String((count ?? 0) + 1).padStart(5, '0');
    const guideNumber = `HD-${year}-${seq}`;

    // 3. Evaluar discrepancias (ítems no recibidos o faltantes)
    const totalExpected = dto.items.length;
    const totalReceived = dto.items.filter((i) => i.is_received).length;
    const hasDiscrepancies = totalReceived < totalExpected;
    const initialStatus = hasDiscrepancies ? 'con_discrepancias' : 'recibida_lab';

    // 4. Crear cabecera de la Hoja de Devolución
    const { data: returnGuide, error: guideErr } = await supabase
      .from('return_guides')
      .insert({
        service_order_id: serviceOrderId,
        guide_number: guideNumber,
        returned_at: dto.returned_at ?? new Date().toISOString(),
        carrier_name: dto.carrier_name ?? null,
        driver_name: dto.driver_name ?? null,
        driver_document: dto.driver_document ?? null,
        delivered_by_client: dto.delivered_by_client ?? null,
        reception_id: dto.reception_id ?? null,
        status: initialStatus,
        observations: dto.observations ?? null,
      })
      .select()
      .single();

    if (guideErr || !returnGuide) {
      this.logger.error('Error al registrar hoja de devolución:', guideErr);
      throw new Error(`No se pudo crear la hoja de devolución: ${guideErr?.message}`);
    }

    // 5. Insertar items devueltos
    const itemsToInsert = dto.items.map((item) => ({
      return_guide_id: returnGuide.id,
      holder_id: item.holder_id ?? null,
      dosimeter_id: item.dosimeter_id ?? null,
      worker_id: item.worker_id ?? null,
      is_received: item.is_received,
      notes: item.notes ?? null,
    }));

    const { error: itemsErr } = await supabase
      .from('return_guide_items')
      .insert(itemsToInsert);

    if (itemsErr) {
      this.logger.error('Error al registrar items devueltos:', itemsErr);
      throw new Error(`Error al registrar dosímetros devueltos: ${itemsErr.message}`);
    }

    // 6. Actualizar portadosímetros recibidos físicamente a estado 'en_triaje'
    const receivedHolderIds = dto.items
      .filter((i) => i.is_received && i.holder_id)
      .map((i) => i.holder_id as string);

    if (receivedHolderIds.length > 0) {
      await supabase
        .from('holder_dosimeters')
        .update({ status: 'en_triaje' })
        .in('id', receivedHolderIds);
    }

    await this.audit.log({
      userId: requestingUserId,
      entityName: 'return_guides',
      entityId: returnGuide.id,
      action: 'CREATE',
      newValues: {
        guide_number: returnGuide.guide_number,
        service_order_id: serviceOrderId,
        total_expected: totalExpected,
        total_received: totalReceived,
        has_discrepancies: hasDiscrepancies,
      },
    });

    return {
      message: 'Hoja de Devolución registrada exitosamente',
      return_guide: returnGuide,
      total_expected: totalExpected,
      total_received: totalReceived,
      has_discrepancies: hasDiscrepancies,
    };
  }
}
