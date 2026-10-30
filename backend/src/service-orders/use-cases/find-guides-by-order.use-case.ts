import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';

@Injectable()
export class FindGuidesByOrderUseCase {
  constructor(private readonly supabase: SupabaseService) {}

  async getDispatchGuide(serviceOrderId: string) {
    const supabase = this.supabase.getClient();

    const { data: guide, error } = await supabase
      .from('dispatch_guides')
      .select(
        `
        id, guide_number, dispatched_at, carrier_name, driver_name, driver_document,
        traveler_holder_id, client_receiver_name, client_signature_url, status, observations, created_at,
        traveler_holder:holder_dosimeters!dispatch_guides_traveler_holder_id_fkey(id, barcode, serial_number),
        items:dispatch_guide_items(
          id, holder_id, dosimeter_id, worker_id, target_location, notes,
          holder:holder_dosimeters(id, barcode, serial_number, current_condition),
          worker:workers(id, full_name, document_number, employee_code)
        )
      `,
      )
      .eq('service_order_id', serviceOrderId)
      .neq('status', 'anulada')
      .maybeSingle();

    if (error) throw new Error(`Error al consultar hoja de entrega: ${error.message}`);
    return guide;
  }

  async getReturnGuide(serviceOrderId: string) {
    const supabase = this.supabase.getClient();

    const { data: guide, error } = await supabase
      .from('return_guides')
      .select(
        `
        id, guide_number, returned_at, carrier_name, driver_name, driver_document,
        delivered_by_client, reception_id, status, observations, created_at,
        items:return_guide_items(
          id, holder_id, dosimeter_id, worker_id, is_received, notes,
          holder:holder_dosimeters(id, barcode, serial_number, current_condition),
          worker:workers(id, full_name, document_number, employee_code)
        )
      `,
      )
      .eq('service_order_id', serviceOrderId)
      .maybeSingle();

    if (error) throw new Error(`Error al consultar hoja de devolución: ${error.message}`);
    return guide;
  }

  async getLogisticsSummary(serviceOrderId: string) {
    const supabase = this.supabase.getClient();

    const { data: order, error: orderErr } = await supabase
      .from('service_orders')
      .select('id, order_number, status, service_type, radiological_practice, cycle_period_month, cycle_period_year')
      .eq('id', serviceOrderId)
      .maybeSingle();

    if (orderErr || !order) throw new NotFoundException('Orden de servicio no encontrada');

    const dispatch = await this.getDispatchGuide(serviceOrderId);
    const returnG = await this.getReturnGuide(serviceOrderId);

    const dispatchedCount = dispatch ? (dispatch.items?.length ?? 0) : 0;
    const returnedCount = returnG ? (returnG.items?.filter((i: any) => i.is_received).length ?? 0) : 0;
    const missingCount = Math.max(0, dispatchedCount - returnedCount);

    return {
      order,
      dispatch_guide: dispatch ?? null,
      return_guide: returnG ?? null,
      summary: {
        dispatched_dosimeters: dispatchedCount,
        returned_dosimeters: returnedCount,
        missing_dosimeters: missingCount,
        has_discrepancies: missingCount > 0,
        cycle_period: order.cycle_period_month && order.cycle_period_year 
          ? `${String(order.cycle_period_month).padStart(2, '0')}/${order.cycle_period_year}`
          : null,
      },
    };
  }
}
