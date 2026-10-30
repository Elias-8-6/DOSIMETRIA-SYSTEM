import { Injectable } from '@nestjs/common';
import { IngestReadingsBatchDto } from './dto/ingest-readings.dto';
import { IngestReadingsUseCase } from './use-cases/ingest-readings.use-case';
import { SupabaseService } from '@config/supabase.config';

@Injectable()
export class ReadingsService {
  constructor(
    private readonly ingestReadingsUseCase: IngestReadingsUseCase,
    private readonly supabase: SupabaseService,
  ) {}

  ingest(dto: IngestReadingsBatchDto, requestingUserId: string) {
    return this.ingestReadingsUseCase.execute(dto, requestingUserId);
  }

  async findByDosimeter(dosimeterId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('dosimeter_readings')
      .select(
        `
        id, dosimeter_id, tld_card_id, read_at, measured_dose, dose_unit, uncertainty,
        charge_pos1_nc, charge_pos2_nc, charge_pos3_nc, charge_pos4_nc, cal_factor_sr90,
        background_subtracted_nc, is_alert_excessive_dose, minsa_report_status,
        reading_status, period_start, period_end, created_at,
        tld_card:tld_cards(id, serial_number, elements_count)
      `,
      )
      .eq('dosimeter_id', dosimeterId)
      .order('read_at', { ascending: false });

    if (error) throw new Error(`Error al consultar lecturas del dosímetro: ${error.message}`);
    return data ?? [];
  }

  async findByWorker(workerId: string) {
    const supabase = this.supabase.getClient();

    // Consultar asignaciones del trabajador
    const { data: assignments } = await supabase
      .from('dosimeter_assignments')
      .select('dosimeter_id, assigned_at, returned_at')
      .eq('worker_id', workerId);

    if (!assignments || assignments.length === 0) return [];

    const dosimeterIds = assignments.map((a: any) => a.dosimeter_id);

    const { data, error } = await supabase
      .from('dosimeter_readings')
      .select(
        `
        id, dosimeter_id, read_at, measured_dose, dose_unit, uncertainty, hp10, hp007,
        is_alert_excessive_dose, minsa_report_status, reading_status, period_start, period_end,
        dosimeters(serial_number, internal_code)
      `,
      )
      .in('dosimeter_id', dosimeterIds)
      .order('read_at', { ascending: false });

    if (error) throw new Error(`Error al consultar historial del trabajador: ${error.message}`);
    return data ?? [];
  }
}
