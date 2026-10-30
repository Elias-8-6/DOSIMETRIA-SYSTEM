import { Injectable } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { QuerySurveyMetersDto } from '../dto/query-survey-meters.dto';

@Injectable()
export class FindSurveyMetersUseCase {
  constructor(private readonly supabase: SupabaseService) {}

  async execute(query: QuerySurveyMetersDto) {
    const supabase = this.supabase.getClient();

    let dbQuery = supabase
      .from('radiation_survey_meters')
      .select('id, model, serial_number, manufacturer, calibration_certificate, calibration_date, calibration_expiry_date, is_active, created_at')
      .order('model', { ascending: true });

    if (query.search) {
      dbQuery = dbQuery.or(`model.ilike.%${query.search}%,serial_number.ilike.%${query.search}%,calibration_certificate.ilike.%${query.search}%`);
    }

    const { data, error } = await dbQuery;
    if (error) {
      throw new Error(`Error al consultar detectores de radiación: ${error.message}`);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const items = (data ?? []).map((m: any) => {
      const expiry = new Date(m.calibration_expiry_date);
      const isExpired = expiry.getTime() < today.getTime();
      const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      return {
        ...m,
        is_expired: isExpired,
        days_until_calibration_expiry: diffDays,
        is_legally_valid: m.is_active && !isExpired,
      };
    });

    if (query.only_valid === 'true') {
      return items.filter((m) => m.is_legally_valid);
    }

    return items;
  }
}
