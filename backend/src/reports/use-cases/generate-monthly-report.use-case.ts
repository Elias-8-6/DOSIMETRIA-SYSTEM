import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { GenerateMonthlyReportDto } from '../dto/generate-monthly-report.dto';
import * as crypto from 'crypto';

@Injectable()
export class GenerateMonthlyReportUseCase {
  constructor(private readonly supabase: SupabaseService) {}

  async execute(
    dto: GenerateMonthlyReportDto,
    userId: string,
    organizationId: string,
  ) {
    const client = this.supabase.getClient();

    // 1. Obtener datos del cliente
    const { data: clientData, error: clientErr } = await client
      .from('clients')
      .select('*')
      .eq('id', dto.client_id)
      .eq('organization_id', organizationId)
      .single();

    if (clientErr || !clientData) {
      throw new NotFoundException(`Cliente con ID ${dto.client_id} no encontrado.`);
    }

    // 2. Si viene service_order_id, validar orden
    let orderData: any = null;
    if (dto.service_order_id) {
      const { data: ord, error: ordErr } = await client
        .from('service_orders')
        .select('*')
        .eq('id', dto.service_order_id)
        .eq('client_id', dto.client_id)
        .single();
      if (!ordErr && ord) {
        orderData = ord;
      }
    }

    // 3. Obtener correlativo anual mediante secuencia de DB o recuento
    const { count } = await client
      .from('official_reports')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('period_year', dto.period_year);
    const correlativeNumber = (count ?? 0) + 1;

    const paddedSeq = String(correlativeNumber).padStart(5, '0');
    const reportNumber = `INF-MINSA-${dto.period_year}-${paddedSeq}`;

    // 4. Obtener trabajadores del cliente
    const { data: workers, error: workersErr } = await client
      .from('workers')
      .select('id, document_number, full_name, occupation, medical_status, minsa_exam_expiry_date')
      .eq('client_id', dto.client_id);

    if (workersErr || !workers || workers.length === 0) {
      throw new BadRequestException('El cliente no tiene trabajadores POE registrados.');
    }

    const workerIds = workers.map((w: any) => w.id);

    // 5. Obtener lecturas en el periodo para los dosímetros asignados a estos trabajadores
    const monthStart = `${dto.period_year}-${String(dto.period_month).padStart(2, '0')}-01`;
    const lastDay = new Date(dto.period_year, dto.period_month, 0).getDate();
    const monthEnd = `${dto.period_year}-${String(dto.period_month).padStart(2, '0')}-${lastDay} 23:59:59`;

    const { data: assignments } = await client
      .from('dosimeter_assignments')
      .select('dosimeter_id, worker_id, assigned_at, returned_at')
      .in('worker_id', workerIds);

    const dosimeterIds = assignments ? assignments.map((a: any) => a.dosimeter_id) : [];

    let readings: any[] = [];
    if (dosimeterIds.length > 0) {
      const { data: rList } = await client
        .from('dosimeter_readings')
        .select('*')
        .in('dosimeter_id', dosimeterIds)
        .gte('read_at', monthStart)
        .lte('read_at', monthEnd);
      readings = rList ?? [];
    }

    // 6. Consultar acumulados anuales para cada trabajador
    const yearStart = `${dto.period_year}-01-01`;
    const yearEnd = `${dto.period_year}-12-31 23:59:59`;
    
    let annualReadings: any[] = [];
    if (dosimeterIds.length > 0) {
      const { data: aList } = await client
        .from('dosimeter_readings')
        .select('dosimeter_id, hp10, hp007')
        .in('dosimeter_id', dosimeterIds)
        .gte('read_at', yearStart)
        .lte('read_at', yearEnd);
      annualReadings = aList ?? [];
    }

    // Mapeo por trabajador
    const reportItems = workers.map((worker: any) => {
      const wAssignments = (assignments ?? []).filter((a: any) => a.worker_id === worker.id);
      const wDosimeterIds = wAssignments.map((a: any) => a.dosimeter_id);

      const wMonthReadings = readings.filter((r: any) => wDosimeterIds.includes(r.dosimeter_id));
      const latestReading = wMonthReadings[0];

      const wAnnualReadings = annualReadings.filter((r: any) => wDosimeterIds.includes(r.dosimeter_id));
      const annualHp10 = wAnnualReadings.reduce((sum: number, r: any) => sum + Number(r.hp10 || 0), 0);
      const annualHp007 = wAnnualReadings.reduce((sum: number, r: any) => sum + Number(r.hp007 || 0), 0);

      const currentHp10 = latestReading ? Number(latestReading.hp10 || 0) : 0;
      const currentHp007 = latestReading ? Number(latestReading.hp007 || 0) : 0;
      const isExcessive = currentHp10 > 2.0 || (latestReading && latestReading.is_alert_excessive_dose);

      return {
        worker_id: worker.id,
        document_number: worker.document_number,
        full_name: worker.full_name,
        occupation: worker.occupation || 'Técnico Radiólogo / POE',
        medical_status: worker.medical_status,
        minsa_exam_expiry_date: worker.minsa_exam_expiry_date,
        dosimeter_id: latestReading ? latestReading.dosimeter_id : null,
        period_hp10_mSv: currentHp10,
        period_hp007_mSv: currentHp007,
        annual_accumulated_hp10_mSv: Number((annualHp10 + currentHp10).toFixed(4)),
        annual_accumulated_hp007_mSv: Number((annualHp007 + currentHp007).toFixed(4)),
        background_dose_subtracted_mSv: latestReading ? Number(latestReading.background_dose || 0) : 0,
        reading_status: latestReading ? latestReading.reading_status : 'sin_lectura',
        is_alert_excessive_dose: Boolean(isExcessive),
        reading_date: latestReading ? latestReading.read_at : null,
      };
    });

    const totalEvaluated = reportItems.length;
    const criticalAlertsCount = reportItems.filter((i: any) => i.is_alert_excessive_dose).length;
    const maxHp10 = reportItems.reduce((max: number, i: any) => Math.max(max, i.period_hp10_mSv), 0);
    const avgHp10 = totalEvaluated > 0 
      ? Number((reportItems.reduce((sum: number, i: any) => sum + i.period_hp10_mSv, 0) / totalEvaluated).toFixed(4))
      : 0;

    // 7. Estructurar content_data canónico (ISO/IEC 17025 y Minsa)
    const contentData = {
      report_metadata: {
        laboratory_name: 'Laboratorio de Dosimetría Personal UTP',
        accreditation: 'ISO/IEC 17025:2017 — Registro Nacional Minsa',
        report_number: reportNumber,
        report_type: 'INFORME MENSUAL DE VIGILANCIA RADIOLÓGICA INDIVIDUAL',
        issued_at: new Date().toISOString(),
        standard_lod_mSv: 0.10,
        calibration_source: 'Estroncio-90 / Itrio-90 (Sr-90/Y-90)',
        uncertainty_k2_percentage: 5.0,
      },
      client: {
        id: clientData.id,
        code: clientData.code,
        name: clientData.name,
        address: clientData.address,
        contact_name: clientData.contact_name,
        contact_email: clientData.contact_email,
        phone: clientData.phone,
        client_type: clientData.client_type,
        practice_type: orderData?.radiological_practice || 'Radiodiagnóstico Médico',
      },
      service_order: orderData ? {
        id: orderData.id,
        code: orderData.order_number,
        service_month: orderData.service_month,
        service_year: orderData.service_year,
      } : null,
      surveillance_period: {
        year: dto.period_year,
        month: dto.period_month,
        period_label: `${String(dto.period_month).padStart(2, '0')}/${dto.period_year}`,
      },
      statistics: {
        total_workers_evaluated: totalEvaluated,
        critical_alerts_count: criticalAlertsCount,
        max_dose_hp10_mSv: maxHp10,
        average_dose_hp10_mSv: avgHp10,
        alert_threshold_mSv: 2.0,
      },
      results: reportItems,
      regulatory_notes: dto.dosimetry_notes || 'Valores por debajo del límite de detección (0.10 mSv) se consideran Dosis No Significativa (DNS). Toda dosis > 2.0 mSv activa protocolo de investigación obligatorio.',
      signatories: {
        dosimetry_officer: 'Responsable de Laboratorio de Dosimetría UTP',
        radiation_protection_officer: 'Oficial de Protección Radiológica (OPR)',
      },
      additional_metadata: dto.additional_metadata || {},
    };

    // 8. Calcular hash de integridad SHA-256 sobre el cuerpo canónico
    const canonicalString = JSON.stringify(contentData, Object.keys(contentData).sort());
    const integrityHash = crypto.createHash('sha256').update(canonicalString).digest('hex');

    // 9. Persistir en official_reports
    const { data: newReport, error: insertErr } = await client
      .from('official_reports')
      .insert({
        organization_id: organizationId,
        client_id: dto.client_id,
        service_order_id: dto.service_order_id || null,
        report_number: reportNumber,
        report_type: 'MENSUAL_CLIENTE',
        period_year: dto.period_year,
        period_month: dto.period_month,
        issued_at: contentData.report_metadata.issued_at,
        issued_by: userId,
        content_data: contentData,
        integrity_hash: integrityHash,
        status: 'EMITIDO',
      })
      .select()
      .single();

    if (insertErr) {
      throw new InternalServerErrorException(
        `Error al emitir informe oficial: ${insertErr.message}`,
      );
    }

    // 10. Registrar en audit_logs para ISO 17025
    await client.from('audit_logs').insert({
      organization_id: organizationId,
      user_id: userId,
      action: 'REPORT_ISSUED',
      table_name: 'official_reports',
      record_id: newReport.id,
      new_values: {
        report_number: reportNumber,
        report_type: 'MENSUAL_CLIENTE',
        client_id: dto.client_id,
        integrity_hash: integrityHash,
      },
    });

    return {
      message: 'Informe oficial mensual emitido satisfactoriamente con sello criptográfico.',
      report: newReport,
    };
  }
}
