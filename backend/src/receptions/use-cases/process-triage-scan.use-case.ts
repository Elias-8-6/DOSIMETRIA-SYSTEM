import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AuditService } from '@common/services/audit.service';
import { ProcessTriageScanDto } from '../dto/process-triage-scan.dto';

// Umbral típico de tasa de dosis de fondo natural: 0.25 µSv/h
const BACKGROUND_DOSE_RATE_THRESHOLD = 0.25;

@Injectable()
export class ProcessTriageScanUseCase {
  private readonly logger = new Logger(ProcessTriageScanUseCase.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  async execute(receptionId: string, dto: ProcessTriageScanDto, requestingUserId: string) {
    const supabase = this.supabase.getClient();

    // 1. Validar que la recepción exista
    const { data: reception, error: recErr } = await supabase
      .from('receptions')
      .select('id, reception_code, service_order_id')
      .eq('id', receptionId)
      .maybeSingle();

    if (recErr || !reception) {
      throw new NotFoundException('Recepción no encontrada');
    }

    // 2. REGLA ISO 17025: Validar que el detector de radiación esté vigente (<2 años) y activo
    const { data: meter, error: meterErr } = await supabase
      .from('radiation_survey_meters')
      .select('id, model, serial_number, calibration_expiry_date, is_active')
      .eq('id', dto.survey_meter_id)
      .maybeSingle();

    if (meterErr || !meter) {
      throw new NotFoundException('Detector de radiación no encontrado');
    }

    if (!meter.is_active) {
      throw new ConflictException(
        `El detector '${meter.model} (${meter.serial_number})' está marcado como inactivo. No puede utilizarse en el triaje.`,
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(meter.calibration_expiry_date);

    if (expiry.getTime() < today.getTime()) {
      throw new ConflictException(
        `RECHAZO ISO 17025: El detector '${meter.model}' tiene el certificado de calibración vencido desde ${meter.calibration_expiry_date}. La prueba de triaje carece de validez legal.`,
      );
    }

    // 3. Buscar portadosímetro por código de barras escaneado (o serie)
    const { data: holder, error: holderErr } = await supabase
      .from('holder_dosimeters')
      .select('id, barcode, serial_number, current_condition')
      .eq('barcode', dto.barcode.trim())
      .maybeSingle();

    if (holderErr || !holder) {
      throw new NotFoundException(
        `Portadosímetro con código de barras '${dto.barcode}' no registrado en el sistema`,
      );
    }

    // 4. Determinar si hay contaminación radiológica
    const isContaminatedByRate = dto.contamination_value > BACKGROUND_DOSE_RATE_THRESHOLD;
    const isContaminatedByCondition = dto.condition === 'contaminado';
    const isContaminated = isContaminatedByRate || isContaminatedByCondition;

    // Decaimiento típico de isótopos de Medicina Nuclear (I-131 / Tc-99m): 8 días de cuarentena
    let isQuarantined = false;
    let quarantineReason: string | null = null;
    let quarantineReleaseDate: string | null = null;

    if (isContaminated) {
      isQuarantined = true;
      quarantineReason = isContaminatedByRate
        ? `Tasa de dosis elevada (${dto.contamination_value} ${dto.contamination_unit ?? 'uSv/h'}) supera fondo de referencia (${BACKGROUND_DOSE_RATE_THRESHOLD} uSv/h)`
        : 'Condición visual o reporte de derrame de material radiactivo';

      const releaseDate = new Date();
      releaseDate.setDate(releaseDate.getDate() + 8);
      quarantineReleaseDate = releaseDate.toISOString();
    }

    // Mapear condición a enum de reception_items
    let mappedCondition: string = 'normal';
    if (dto.condition === 'danado_leve' || dto.condition === 'danado_grave') mappedCondition = 'danado_fisico';
    else if (dto.condition === 'sello_roto') mappedCondition = 'sello_roto';
    else if (dto.condition === 'contaminado' || isContaminated) mappedCondition = 'contaminado';
    else if (dto.condition === 'perdido') mappedCondition = 'perdido';

    // 5. Insertar ítem de triaje en reception_items
    const { data: triageItem, error: insertErr } = await supabase
      .from('reception_items')
      .insert({
        reception_id: receptionId,
        holder_id: holder.id,
        scanned_barcode: holder.barcode,
        received_condition: mappedCondition,
        sealed: dto.sealed ?? (dto.condition !== 'sello_roto'),
        contaminated: isContaminated,
        contamination_value: dto.contamination_value,
        contamination_unit: dto.contamination_unit ?? 'uSv/h',
        survey_meter_id: dto.survey_meter_id,
        is_quarantined: isQuarantined,
        quarantine_reason: quarantineReason,
        quarantine_release_date: quarantineReleaseDate,
        observations: dto.observations ?? null,
        condition_photo_url: dto.condition_photo_url ?? null,
      })
      .select()
      .single();

    if (insertErr || !triageItem) {
      this.logger.error('Error al registrar ítem de triaje:', insertErr);
      throw new Error(`Error al registrar triaje: ${insertErr?.message}`);
    }

    // 6. Actualizar condición y estado del portadosímetro
    await supabase
      .from('holder_dosimeters')
      .update({
        current_condition: dto.condition,
        status: isQuarantined ? 'en_triaje' : 'disponible',
      })
      .eq('id', holder.id);

    await this.audit.log({
      userId: requestingUserId,
      entityName: 'reception_items',
      entityId: triageItem.id,
      action: 'CREATE',
      newValues: {
        barcode: holder.barcode,
        condition: dto.condition,
        measured_rate: dto.contamination_value,
        detector: `${meter.model} (${meter.serial_number})`,
        quarantined: isQuarantined,
      },
    });

    return {
      message: isQuarantined
        ? '¡ALERTA RADIOLÓGICA! Dosímetro contaminado puesto en cuarentena automática (8 días de decaimiento)'
        : 'Triaje completado satisfactoriamente. Dosímetro conforme para lectura.',
      triage_result: {
        item_id: triageItem.id,
        barcode: holder.barcode,
        condition: dto.condition,
        measured_dose_rate: `${dto.contamination_value} ${dto.contamination_unit ?? 'uSv/h'}`,
        detector_verified: `${meter.model} - Calibración vigente hasta ${meter.calibration_expiry_date}`,
        is_quarantined: isQuarantined,
        quarantine_release_date: quarantineReleaseDate,
      },
    };
  }
}
