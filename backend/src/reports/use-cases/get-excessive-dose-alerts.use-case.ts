import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { QueryExcessiveDoseAlertsDto } from '../dto/query-excessive-dose-alerts.dto';

@Injectable()
export class GetExcessiveDoseAlertsUseCase {
  constructor(private readonly supabase: SupabaseService) {}

  async execute(dto: QueryExcessiveDoseAlertsDto, organizationId: string) {
    const client = this.supabase.getClient();

    let query = client
      .from('v_excessive_dose_alerts')
      .select('*')
      .order('read_at', { ascending: false });

    if (dto.client_id) {
      query = query.eq('client_id', dto.client_id);
    }
    if (dto.worker_id) {
      query = query.eq('worker_id', dto.worker_id);
    }
    if (dto.incident_status) {
      query = query.eq('incident_status', dto.incident_status);
    }
    if (dto.from_date) {
      query = query.gte('read_at', dto.from_date);
    }
    if (dto.to_date) {
      query = query.lte('read_at', dto.to_date);
    }

    const { data, error } = await query;
    if (error) {
      throw new InternalServerErrorException(
        `Error al consultar alertas de dosis excesiva: ${error.message}`,
      );
    }

    return {
      total: data?.length ?? 0,
      threshold_mSv: 2.0,
      alerts: data ?? [],
    };
  }
}
