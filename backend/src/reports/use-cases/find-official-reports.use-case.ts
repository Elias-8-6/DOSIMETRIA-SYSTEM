import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { QueryReportsDto } from '../dto/query-reports.dto';

@Injectable()
export class FindOfficialReportsUseCase {
  constructor(private readonly supabase: SupabaseService) {}

  async execute(dto: QueryReportsDto, organizationId: string) {
    const client = this.supabase.getClient();

    let query = client
      .from('official_reports')
      .select('id, organization_id, client_id, service_order_id, report_number, report_type, period_year, period_month, issued_at, issued_by, integrity_hash, status, clients(name, code)', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('issued_at', { ascending: false });

    if (dto.client_id) query = query.eq('client_id', dto.client_id);
    if (dto.report_type) query = query.eq('report_type', dto.report_type);
    if (dto.year) query = query.eq('period_year', dto.year);
    if (dto.month) query = query.eq('period_month', dto.month);
    if (dto.status) query = query.eq('status', dto.status);

    const limit = dto.limit ?? 50;
    const offset = dto.offset ?? 0;
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) {
      throw new InternalServerErrorException(`Error al consultar informes: ${error.message}`);
    }

    return {
      total: count ?? 0,
      limit,
      offset,
      data: data ?? [],
    };
  }
}
