import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { GenerateWorkerHistoryDto } from '../dto/generate-worker-history.dto';
import * as crypto from 'crypto';

@Injectable()
export class GenerateWorkerHistoryUseCase {
  constructor(private readonly supabase: SupabaseService) {}

  async execute(
    dto: GenerateWorkerHistoryDto,
    userId: string,
    organizationId: string,
  ) {
    const client = this.supabase.getClient();

    // 1. Obtener datos del trabajador
    const { data: worker, error: workerErr } = await client
      .from('workers')
      .select('*, clients(id, name, code, address)')
      .eq('id', dto.worker_id)
      .single();

    if (workerErr || !worker) {
      throw new NotFoundException(`Trabajador con ID ${dto.worker_id} no encontrado.`);
    }

    // 2. Obtener todas las asignaciones históricas del trabajador
    const { data: assignments } = await client
      .from('dosimeter_assignments')
      .select('dosimeter_id, assigned_at, returned_at')
      .eq('worker_id', dto.worker_id)
      .order('assigned_at', { ascending: true });

    const dosimeterIds = assignments ? assignments.map((a: any) => a.dosimeter_id) : [];

    let readings: any[] = [];
    if (dosimeterIds.length > 0) {
      let query = client
        .from('dosimeter_readings')
        .select('*')
        .in('dosimeter_id', dosimeterIds)
        .order('read_at', { ascending: true });

      if (dto.from_year) {
        query = query.gte('read_at', `${dto.from_year}-01-01`);
      }
      if (dto.to_year) {
        query = query.lte('read_at', `${dto.to_year}-12-31 23:59:59`);
      }

      const { data: rList, error: rErr } = await query;
      if (rErr) {
        throw new InternalServerErrorException(`Error al consultar lecturas: ${rErr.message}`);
      }
      readings = rList ?? [];
    }

    // 3. Agregación anual histórica
    const yearlyBreakdown: Record<number, {
      year: number;
      readings_count: number;
      total_hp10_mSv: number;
      total_hp007_mSv: number;
      critical_alerts_count: number;
      limit_consumed_percentage: number;
    }> = {};

    let totalLifetimeHp10 = 0;
    let totalLifetimeHp007 = 0;
    let totalLifetimeAlerts = 0;

    for (const r of readings) {
      const rDate = new Date(r.read_at);
      const rYear = rDate.getFullYear();
      const hp10 = Number(r.hp10 || r.measured_dose || 0);
      const hp007 = Number(r.hp007 || 0);
      const isAlert = Boolean(r.is_alert_excessive_dose || hp10 > 2.0);

      totalLifetimeHp10 += hp10;
      totalLifetimeHp007 += hp007;
      if (isAlert) totalLifetimeAlerts++;

      if (!yearlyBreakdown[rYear]) {
        yearlyBreakdown[rYear] = {
          year: rYear,
          readings_count: 0,
          total_hp10_mSv: 0,
          total_hp007_mSv: 0,
          critical_alerts_count: 0,
          limit_consumed_percentage: 0,
        };
      }

      yearlyBreakdown[rYear].readings_count++;
      yearlyBreakdown[rYear].total_hp10_mSv += hp10;
      yearlyBreakdown[rYear].total_hp007_mSv += hp007;
      if (isAlert) yearlyBreakdown[rYear].critical_alerts_count++;
    }

    const yearlyList = Object.values(yearlyBreakdown).map((item) => {
      item.total_hp10_mSv = Number(item.total_hp10_mSv.toFixed(4));
      item.total_hp007_mSv = Number(item.total_hp007_mSv.toFixed(4));
      item.limit_consumed_percentage = Number(((item.total_hp10_mSv / 20.0) * 100).toFixed(2));
      return item;
    });

    const reportData = {
      record_type: 'HISTORIAL_DOSIMÉTRICO_VIDA_LABORAL_POE_MINSA',
      retention_legal_period: '50 a 75 años (Decreto Supremo Protección Radiológica)',
      worker_profile: {
        id: worker.id,
        document_number: worker.document_number,
        full_name: worker.full_name,
        date_of_birth: worker.date_of_birth,
        gender: worker.gender,
        occupation: worker.occupation,
        start_date: worker.start_date,
        medical_status: worker.medical_status,
        minsa_exam_date: worker.minsa_exam_date,
        minsa_exam_expiry_date: worker.minsa_exam_expiry_date,
        minsa_certificate_code: worker.minsa_certificate_code,
      },
      employer: {
        client_id: worker.clients?.id,
        name: worker.clients?.name,
        code: worker.clients?.code,
        address: worker.clients?.address,
      },
      lifetime_summary: {
        total_evaluations_count: readings.length,
        lifetime_total_hp10_mSv: Number(totalLifetimeHp10.toFixed(4)),
        lifetime_total_hp007_mSv: Number(totalLifetimeHp007.toFixed(4)),
        critical_alerts_total_count: totalLifetimeAlerts,
        annual_dose_limit_reference_mSv: 20.0,
        five_year_cumulative_limit_reference_mSv: 100.0,
      },
      yearly_breakdown: yearlyList,
      detailed_readings_chronology: readings.map((r: any) => ({
        reading_id: r.id,
        dosimeter_id: r.dosimeter_id,
        read_at: r.read_at,
        hp10_mSv: Number(r.hp10 || 0),
        hp007_mSv: Number(r.hp007 || 0),
        background_dose_mSv: Number(r.background_dose || 0),
        status: r.reading_status,
        is_alert_excessive_dose: Boolean(r.is_alert_excessive_dose || Number(r.hp10 || 0) > 2.0),
      })),
      generated_at: new Date().toISOString(),
    };

    const canonicalString = JSON.stringify(reportData, Object.keys(reportData).sort());
    const integrityHash = crypto.createHash('sha256').update(canonicalString).digest('hex');

    return {
      message: 'Historial dosimétrico de vida laboral generado exitosamente.',
      integrity_hash: integrityHash,
      data: reportData,
    };
  }
}
