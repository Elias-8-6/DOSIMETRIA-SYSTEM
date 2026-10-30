import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AuditService } from '@common/services/audit.service';
import { IngestReadingsBatchDto } from '../dto/ingest-readings.dto';

@Injectable()
export class IngestReadingsUseCase {
  private readonly logger = new Logger(IngestReadingsUseCase.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  async execute(dto: IngestReadingsBatchDto, requestingUserId: string) {
    const supabase = this.supabase.getClient();

    // 1. CONTROL DE IDEMPOTENCIA: Verificar si el archivo ya fue procesado mediante su hash SHA-256
    const { data: existingAudit } = await supabase
      .from('audit_logs')
      .select('id, created_at')
      .eq('entity_name', 'dosimeter_readings_batch')
      .eq('entity_id', dto.source_file_sha256)
      .maybeSingle();

    if (existingAudit) {
      this.logger.warn(
        `Lote con SHA-256 '${dto.source_file_sha256}' ya fue ingerido previamente en ${existingAudit.created_at}. Respuesta idempotente.`,
      );
      return {
        message: 'El archivo ya fue procesado previamente. No se duplicaron mediciones (Idempotencia).',
        sha256: dto.source_file_sha256,
        is_idempotent_replay: true,
        processed_count: 0,
      };
    }

    const insertedIds: string[] = [];
    const criticalAlerts: Array<{ serial: string; dose: number }> = [];

    // 2. Procesar e insertar cada lectura
    for (const r of dto.readings) {
      // Resolver tarjeta TLD y su dosímetro vinculado
      let tldCardId = r.tld_card_id;
      let dosimeterId = r.dosimeter_id;

      if (!tldCardId && r.tld_serial_number) {
        const { data: card } = await supabase
          .from('tld_cards')
          .select('id')
          .eq('serial_number', r.tld_serial_number)
          .maybeSingle();

        if (card) tldCardId = card.id;
      }

      // Si no tenemos dosimeter_id pero sí tld_card_id, buscamos el portadosímetro/dosímetro legacy
      if (!dosimeterId && tldCardId) {
        const { data: assembly } = await supabase
          .from('holder_tld_assemblies')
          .select('holder:holder_dosimeters(serial_number)')
          .eq('tld_card_id', tldCardId)
          .maybeSingle();

        if (assembly && (assembly.holder as any)?.serial_number) {
          const { data: legacyDosimeter } = await supabase
            .from('dosimeters')
            .select('id')
            .eq('serial_number', (assembly.holder as any).serial_number)
            .maybeSingle();

          if (legacyDosimeter) dosimeterId = legacyDosimeter.id;
        }
      }

      // Si aún no hay dosimeterId, resolvemos el primer dosímetro disponible como ancla referencial
      if (!dosimeterId) {
        const { data: defaultDosimeter } = await supabase
          .from('dosimeters')
          .select('id')
          .limit(1)
          .single();

        dosimeterId = defaultDosimeter?.id;
      }

      const readingStatus = r.reading_status ?? 'valido';
      const readAt = r.read_at ? new Date(r.read_at).toISOString() : new Date().toISOString();

      const { data: inserted, error: insertErr } = await supabase
        .from('dosimeter_readings')
        .insert({
          dosimeter_id: dosimeterId,
          tld_card_id: tldCardId ?? null,
          service_order_id: r.service_order_id ?? null,
          equipment_id: r.equipment_id ?? null,
          read_at: readAt,
          charge_pos1_nc: r.charge_pos1_nc,
          charge_pos2_nc: r.charge_pos2_nc,
          charge_pos3_nc: r.charge_pos3_nc ?? null,
          charge_pos4_nc: r.charge_pos4_nc ?? null,
          cal_factor_sr90: dto.cal_factor_sr90,
          background_subtracted_nc: dto.traveler_charge_nc ?? 0,
          measured_dose: r.measured_dose,
          dose_unit: r.dose_unit ?? 'mSv',
          uncertainty: r.uncertainty ?? 0.05,
          hp10: r.hp10 ?? r.measured_dose,
          hp007: r.hp007 ?? r.measured_dose,
          background_dose: dto.traveler_charge_nc ? dto.traveler_charge_nc * dto.cal_factor_sr90 : 0,
          reading_status: readingStatus,
          period_start: dto.period_start ?? null,
          period_end: dto.period_end ?? null,
          raw_data: {
            ...r.raw_data,
            source_file: dto.source_file_name,
            file_sha256: dto.source_file_sha256,
          },
        })
        .select('id, measured_dose, is_alert_excessive_dose')
        .single();

      if (insertErr || !inserted) {
        this.logger.error(`Error al insertar lectura de TLD ${r.tld_serial_number}:`, insertErr);
        throw new Error(`Error al persistir lectura dosimétrica: ${insertErr?.message}`);
      }

      insertedIds.push(inserted.id);

      if (inserted.is_alert_excessive_dose || r.measured_dose > 2.0) {
        criticalAlerts.push({
          serial: r.tld_serial_number,
          dose: r.measured_dose,
        });
      }
    }

    // 3. Registrar auditoría con el hash del lote para sellar la idempotencia
    await this.audit.log({
      userId: requestingUserId,
      entityName: 'dosimeter_readings_batch',
      entityId: dto.source_file_sha256,
      action: 'CREATE',
      newValues: {
        file_name: dto.source_file_name,
        sha256: dto.source_file_sha256,
        cal_factor: dto.cal_factor_sr90,
        total_readings: dto.readings.length,
        critical_alerts: criticalAlerts.length,
      },
    });

    return {
      message: 'Ingesta dosimétrica procesada exitosamente',
      sha256: dto.source_file_sha256,
      file_name: dto.source_file_name,
      total_ingested: insertedIds.length,
      critical_alerts_count: criticalAlerts.length,
      critical_alerts: criticalAlerts,
    };
  }
}
