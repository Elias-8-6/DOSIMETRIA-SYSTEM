import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AuditService } from '@common/services/audit.service';

@Injectable()
export class QuarantineDosimetersUseCase {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  async listQuarantined() {
    const supabase = this.supabase.getClient();

    const { data, error } = await supabase
      .from('reception_items')
      .select(
        `
        id, scanned_barcode, contamination_value, contamination_unit,
        is_quarantined, quarantine_reason, quarantine_release_date, observations,
        reception:receptions(id, reception_code, received_at),
        holder:holder_dosimeters(id, barcode, serial_number, current_condition),
        survey_meter:radiation_survey_meters(id, model, serial_number, calibration_certificate)
      `,
      )
      .eq('is_quarantined', true)
      .order('quarantine_release_date', { ascending: true });

    if (error) {
      throw new Error(`Error al listar dosímetros en cuarentena: ${error.message}`);
    }

    const now = new Date();

    return (data ?? []).map((item: any) => {
      let daysRemaining = 0;
      let hoursRemaining = 0;
      let canBeReleased = false;

      if (item.quarantine_release_date) {
        const releaseTime = new Date(item.quarantine_release_date).getTime();
        const diffMs = releaseTime - now.getTime();

        if (diffMs <= 0) {
          canBeReleased = true;
        } else {
          daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          hoursRemaining = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        }
      }

      return {
        ...item,
        can_be_released: canBeReleased,
        decay_time_remaining: canBeReleased ? 'Decaimiento completado' : `${daysRemaining}d ${hoursRemaining}h`,
      };
    });
  }

  async releaseFromQuarantine(itemId: string, requestingUserId: string) {
    const supabase = this.supabase.getClient();

    const { data: item, error } = await supabase
      .from('reception_items')
      .select('id, holder_id, is_quarantined, scanned_barcode')
      .eq('id', itemId)
      .maybeSingle();

    if (error || !item) {
      throw new NotFoundException('Ítem de triaje no encontrado');
    }

    // Levantar cuarentena
    const { error: updateErr } = await supabase
      .from('reception_items')
      .update({
        is_quarantined: false,
        observations: 'Liberado de cuarentena por decaimiento radiactivo verificado.',
      })
      .eq('id', itemId);

    if (updateErr) {
      throw new Error(`Error al liberar de cuarentena: ${updateErr.message}`);
    }

    if (item.holder_id) {
      await supabase
        .from('holder_dosimeters')
        .update({
          current_condition: 'integro',
          status: 'disponible',
        })
        .eq('id', item.holder_id);
    }

    await this.audit.log({
      userId: requestingUserId,
      entityName: 'reception_items',
      entityId: itemId,
      action: 'UPDATE',
      oldValues: { is_quarantined: true },
      newValues: {
        is_quarantined: false,
        released_at: new Date().toISOString(),
      },
    });

    return {
      message: `Dosímetro '${item.scanned_barcode}' liberado de cuarentena y retornado a disponibilidad operativa`,
      item_id: itemId,
    };
  }
}
