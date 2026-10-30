import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { GenerateExcessiveDoseReportDto } from '../dto/generate-excessive-dose-report.dto';
import * as crypto from 'crypto';

@Injectable()
export class GenerateUrgentExcessiveDoseReportUseCase {
  constructor(private readonly supabase: SupabaseService) {}

  async execute(
    dto: GenerateExcessiveDoseReportDto,
    userId: string,
    organizationId: string,
  ) {
    const client = this.supabase.getClient();

    // 1. Obtener la lectura crítica
    const { data: reading, error: readingErr } = await client
      .from('dosimeter_readings')
      .select('*, dosimeters(id, serial_number, client_id)')
      .eq('id', dto.reading_id)
      .single();

    if (readingErr || !reading) {
      throw new NotFoundException(`Lectura con ID ${dto.reading_id} no encontrada.`);
    }

    const hp10 = Number(reading.hp10 || reading.measured_dose || 0);
    if (!reading.is_alert_excessive_dose && hp10 <= 2.0) {
      throw new BadRequestException(
        `La lectura seleccionada (${hp10} mSv) no supera el umbral crítico de alerta (>2.0 mSv).`,
      );
    }

    // 2. Obtener dosímetro y asignación
    const dosimeterId = reading.dosimeter_id;
    const { data: assignment } = await client
      .from('dosimeter_assignments')
      .select('*, workers(*, clients(*))')
      .eq('dosimeter_id', dosimeterId)
      .lte('assigned_at', reading.read_at)
      .order('assigned_at', { ascending: false })
      .limit(1)
      .single();

    const worker = assignment?.workers;
    const clientData = worker?.clients;

    if (!clientData) {
      throw new BadRequestException('No se pudo asociar la lectura crítica a un cliente activo.');
    }

    // 3. Generar correlativo de urgencia
    const reportYear = new Date(reading.read_at).getFullYear();
    const { count } = await client
      .from('official_reports')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('report_type', 'URGENTE_DOSIS_EXCESIVA')
      .eq('period_year', reportYear);

    const seqPadded = String((count ?? 0) + 1).padStart(5, '0');
    const reportNumber = `INF-URG-${reportYear}-${seqPadded}`;

    // 4. Vincular o actualizar incident_reports
    let incidentId = dto.incident_report_id;
    if (!incidentId) {
      const { data: existingInc } = await client
        .from('incident_reports')
        .select('id')
        .eq('dosimeter_id', dosimeterId)
        .eq('incident_type', 'dosis_elevada')
        .limit(1)
        .single();

      if (existingInc) {
        incidentId = existingInc.id;
      } else {
        const { data: newInc } = await client
          .from('incident_reports')
          .insert({
            reported_by: userId,
            dosimeter_id: dosimeterId,
            incident_type: 'dosis_elevada',
            severity: 'critica',
            status: 'EN_INVESTIGACION',
            description: `Dosis excesiva detectada: ${hp10} mSv en el periodo ${reading.read_at}. Trabajador: ${worker?.full_name || 'Desconocido'}.`,
            corrective_action: dto.corrective_actions || null,
          })
          .select('id')
          .single();
        incidentId = newInc?.id;
      }
    } else {
      await client
        .from('incident_reports')
        .update({
          status: 'EN_INVESTIGACION',
          corrective_action: dto.corrective_actions || undefined,
        })
        .eq('id', incidentId);
    }

    // 5. Construir content_data del informe urgente Minsa
    const contentData = {
      report_metadata: {
        laboratory_name: 'Laboratorio de Dosimetría Personal UTP',
        accreditation: 'ISO/IEC 17025:2017 — Registro Nacional Minsa',
        report_number: reportNumber,
        report_type: 'INFORME TÉCNICO URGENTE POR EXCESO DE DOSIS RADIOLÓGICA OCUPACIONAL',
        urgency_level: 'CRÍTICA / CENTINELA',
        issued_at: new Date().toISOString(),
        regulatory_norm: 'Reglamento de Seguridad Radiológica Nacional — Dosis mensual > 2.0 mSv',
      },
      critical_reading: {
        reading_id: reading.id,
        read_at: reading.read_at,
        measured_dose_hp10_mSv: hp10,
        hp007_mSv: Number(reading.hp007 || 0),
        background_dose_subtracted_mSv: Number(reading.background_dose || 0),
        equipment_id: reading.equipment_id,
        raw_data: reading.raw_data,
      },
      affected_worker: {
        id: worker?.id,
        document_number: worker?.document_number,
        full_name: worker?.full_name,
        occupation: worker?.occupation,
        medical_status: worker?.medical_status,
        minsa_exam_expiry_date: worker?.minsa_exam_expiry_date,
      },
      employer: {
        id: clientData.id,
        code: clientData.code,
        name: clientData.name,
        address: clientData.address,
        contact_name: clientData.contact_name,
        contact_email: clientData.contact_email,
        phone: clientData.phone,
      },
      dosimeter_details: {
        dosimeter_id: dosimeterId,
        serial_number: reading.dosimeters?.serial_number,
      },
      investigation_protocol: {
        incident_report_id: incidentId,
        investigation_summary: dto.investigation_summary,
        corrective_actions_recommended: dto.corrective_actions || 'Retirar temporalmente al POE del área de radiación hasta esclarecimiento; revisión de blindajes y prácticas.',
        opr_conclusion: dto.opr_conclusion || 'Pendiente de descargo técnico por el titular de la instalación.',
      },
      signatories: {
        investigating_officer: 'Oficial de Protección Radiológica (OPR)',
        laboratory_director: 'Director Técnico de Dosimetría UTP',
      },
    };

    // 6. Generar hash SHA-256 de integridad
    const canonicalString = JSON.stringify(contentData, Object.keys(contentData).sort());
    const integrityHash = crypto.createHash('sha256').update(canonicalString).digest('hex');

    // 7. Insertar en official_reports
    const { data: reportRecord, error: insertErr } = await client
      .from('official_reports')
      .insert({
        organization_id: organizationId,
        client_id: clientData.id,
        service_order_id: reading.service_order_id || null,
        report_number: reportNumber,
        report_type: 'URGENTE_DOSIS_EXCESIVA',
        period_year: reportYear,
        period_month: new Date(reading.read_at).getMonth() + 1,
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
        `Error al guardar informe de urgencia: ${insertErr.message}`,
      );
    }

    // 8. Auditoría
    await client.from('audit_logs').insert({
      organization_id: organizationId,
      user_id: userId,
      action: 'CRITICAL_DOSE_REPORT_ISSUED',
      table_name: 'official_reports',
      record_id: reportRecord.id,
      new_values: {
        report_number: reportNumber,
        reading_id: reading.id,
        measured_dose: hp10,
        integrity_hash: integrityHash,
      },
    });

    return {
      message: 'Informe urgente de dosis excesiva emitido satisfactoriamente.',
      report: reportRecord,
    };
  }
}
