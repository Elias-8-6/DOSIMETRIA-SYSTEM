import { Injectable } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { sanitizeSearchTerm } from '@common/utils/search.util';
import { normalizePagination } from '@common/utils/pagination.util';
import { QueryTldCardsDto } from '../dto/query-tld-cards.dto';

@Injectable()
export class FindTldCardsUseCase {
  constructor(private readonly supabase: SupabaseService) {}

  async execute(query: QueryTldCardsDto) {
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 10;
    const { from, to } = normalizePagination(page, limit);
    const safeSearch = sanitizeSearchTerm(query.search);

    let dbQuery = this.supabase
      .getClient()
      .from('tld_cards')
      .select(
        `
        id, serial_number, elements_count, tld_material, annealing_cycles_count, last_annealing_date, status, notes, created_at,
        holder_tld_assemblies(
          id, is_active, assembled_at,
          holder_dosimeters(id, barcode, serial_number, status, current_condition)
        )
      `,
        { count: 'exact' },
      )
      .order('serial_number', { ascending: true });

    if (query.status) dbQuery = dbQuery.eq('status', query.status);
    if (query.elements_count) dbQuery = dbQuery.eq('elements_count', parseInt(query.elements_count, 10));
    if (safeSearch) {
      dbQuery = dbQuery.ilike('serial_number', `%${safeSearch}%`);
    }

    dbQuery = dbQuery.range(from, to);

    const { data, error, count } = await dbQuery;
    if (error) {
      throw new Error(`Error al listar tarjetas TLD: ${error.message}`);
    }

    const items = (data ?? []).map((t: any) => {
      const activeAssembly = (t.holder_tld_assemblies ?? []).find((a: any) => a.is_active);
      return {
        ...t,
        active_assembly: activeAssembly
          ? {
              assembly_id: activeAssembly.id,
              assembled_at: activeAssembly.assembled_at,
              holder: activeAssembly.holder_dosimeters,
            }
          : null,
      };
    });

    return { items, total: count ?? 0 };
  }
}
