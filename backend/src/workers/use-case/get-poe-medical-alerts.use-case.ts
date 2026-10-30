import { Injectable } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';

export interface PoeMedicalAlertItem {
  id: string;
  full_name: string;
  document_number: string | null;
  employee_code: string | null;
  occupation: string | null;
  client_id: string;
  client_name: string;
  client_location_name: string | null;
  minsa_exam_date: string | null;
  minsa_exam_expiry_date: string | null;
  days_until_expiry: number;
  alert_severity: 'critica_vencido' | 'alta_30_dias' | 'preventiva_60_dias';
  medical_status: string;
}

@Injectable()
export class GetPoeMedicalAlertsUseCase {
  constructor(private readonly supabase: SupabaseService) {}

  async execute(
    organizationId: string,
    thresholdDays: number = 60,
    clientId?: string,
  ): Promise<{ alerts: PoeMedicalAlertItem[]; total: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maxExpiryDate = new Date(today);
    maxExpiryDate.setDate(maxExpiryDate.getDate() + thresholdDays);

    let query = this.supabase
      .getClient()
      .from('workers')
      .select(
        `
        id, employee_code, full_name, document_number, occupation, medical_status,
        minsa_exam_date, minsa_exam_expiry_date,
        clients!inner(id, name, organization_id),
        client_locations(id, name)
      `,
      )
      .eq('clients.organization_id', organizationId)
      .eq('status', 'active')
      .not('minsa_exam_expiry_date', 'is', null)
      .lte('minsa_exam_expiry_date', maxExpiryDate.toISOString().split('T')[0])
      .order('minsa_exam_expiry_date', { ascending: true });

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Error al consultar alertas médicas POE: ${error.message}`);
    }

    const alerts: PoeMedicalAlertItem[] = (data ?? []).map((w: any) => {
      const expiry = new Date(w.minsa_exam_expiry_date);
      const diffTime = expiry.getTime() - today.getTime();
      const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let severity: 'critica_vencido' | 'alta_30_dias' | 'preventiva_60_dias';
      if (daysUntilExpiry < 0) {
        severity = 'critica_vencido';
      } else if (daysUntilExpiry <= 30) {
        severity = 'alta_30_dias';
      } else {
        severity = 'preventiva_60_dias';
      }

      return {
        id: w.id,
        full_name: w.full_name,
        document_number: w.document_number,
        employee_code: w.employee_code,
        occupation: w.occupation,
        client_id: w.clients?.id,
        client_name: w.clients?.name,
        client_location_name: w.client_locations?.name ?? null,
        minsa_exam_date: w.minsa_exam_date,
        minsa_exam_expiry_date: w.minsa_exam_expiry_date,
        days_until_expiry: daysUntilExpiry,
        alert_severity: severity,
        medical_status: w.medical_status,
      };
    });

    return { alerts, total: alerts.length };
  }
}
