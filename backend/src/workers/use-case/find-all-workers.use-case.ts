import { Injectable } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { sanitizeSearchTerm } from '@common/utils/search.util';
import { normalizePagination } from '@common/utils/pagination.util';

@Injectable()
export class FindAllWorkersUseCase {
  constructor(private supabase: SupabaseService) {}

  async execute(
    organizationId: string,
    search?: string,
    status?: string,
    medicalStatus?: string,
    clientId?: string,
    clientLocationId?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const { from, to } = normalizePagination(page, limit);
    const safeSearch = sanitizeSearchTerm(search);

    let query = this.supabase
      .getClient()
      .from('workers')
      .select(
        `
      id, employee_code, full_name, document_number, status, occupation,
      minsa_exam_date, minsa_exam_expiry_date, minsa_certificate_code, medical_status,
      clients!inner(id, name, code, organization_id),
      client_locations(id, name)
      `,
        { count: 'exact' },
      )
      .eq('clients.organization_id', organizationId)
      .order('full_name', { ascending: true });

    if (status) query = query.eq('status', status);
    if (medicalStatus) query = query.eq('medical_status', medicalStatus);
    if (clientId) query = query.eq('client_id', clientId);
    if (clientLocationId) query = query.eq('client_location_id', clientLocationId);
    if (safeSearch) {
      query = query.or(
        `full_name.ilike.%${safeSearch}%,document_number.ilike.%${safeSearch}%,employee_code.ilike.%${safeSearch}%`,
      );
    }

    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw new Error('No se pudo obtener el listado de trabajadores');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const items = (data ?? []).map((w: any) => {
      let daysUntilMedicalExpiry: number | null = null;
      let calculatedMedicalAlert: 'valido' | 'proximo_a_vencer' | 'vencido' | 'sin_registro' =
        'sin_registro';

      if (w.minsa_exam_expiry_date) {
        const expiry = new Date(w.minsa_exam_expiry_date);
        const diffTime = expiry.getTime() - today.getTime();
        daysUntilMedicalExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysUntilMedicalExpiry < 0) {
          calculatedMedicalAlert = 'vencido';
        } else if (daysUntilMedicalExpiry <= 60) {
          calculatedMedicalAlert = 'proximo_a_vencer';
        } else {
          calculatedMedicalAlert = 'valido';
        }
      }

      return {
        ...w,
        days_until_medical_expiry: daysUntilMedicalExpiry,
        medical_alert_level: calculatedMedicalAlert,
      };
    });

    return { items, total: count ?? 0 };
  }
}
