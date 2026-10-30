import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { sanitizeSearchTerm } from '@common/utils/search.util';
import { normalizePagination } from '@common/utils/pagination.util';
import { QueryHoldersDto } from '../dto/query-holders.dto';

@Injectable()
export class FindHoldersUseCase {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(query: QueryHoldersDto) {
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 10;
    const { from, to } = normalizePagination(page, limit);
    const safeSearch = sanitizeSearchTerm(query.search);

    let dbQuery = this.supabase
      .getClient()
      .from('holder_dosimeters')
      .select(
        `
        id, barcode, serial_number, holder_color, clip_type, current_condition, status, notes, photo_url, created_at,
        holder_tld_assemblies(
          id, is_active, assembled_at,
          tld_cards(id, serial_number, elements_count, tld_material, annealing_cycles_count, status)
        )
      `,
        { count: 'exact' },
      )
      .order('barcode', { ascending: true });

    if (query.status) dbQuery = dbQuery.eq('status', query.status);
    if (query.current_condition) dbQuery = dbQuery.eq('current_condition', query.current_condition);
    if (safeSearch) {
      dbQuery = dbQuery.or(`barcode.ilike.%${safeSearch}%,serial_number.ilike.%${safeSearch}%`);
    }

    dbQuery = dbQuery.range(from, to);

    const { data, error, count } = await dbQuery;
    if (error) {
      throw new Error(`Error al listar portadosímetros: ${error.message}`);
    }

    const items = (data ?? []).map((h: any) => {
      const activeAssembly = (h.holder_tld_assemblies ?? []).find((a: any) => a.is_active);
      return {
        ...h,
        active_assembly: activeAssembly
          ? {
              assembly_id: activeAssembly.id,
              assembled_at: activeAssembly.assembled_at,
              tld_card: activeAssembly.tld_cards,
            }
          : null,
      };
    });

    return { items, total: count ?? 0 };
  }

  async findByBarcode(barcode: string) {
    const safeBarcode = barcode.trim();
    const { data, error } = await this.supabase
      .getClient()
      .from('holder_dosimeters')
      .select(
        `
        id, barcode, serial_number, holder_color, clip_type, current_condition, status, notes, photo_url, created_at,
        holder_tld_assemblies(
          id, is_active, assembled_at,
          tld_cards(id, serial_number, elements_count, tld_material, annealing_cycles_count, status)
        )
      `,
      )
      .eq('barcode', safeBarcode)
      .maybeSingle();

    if (error) throw new Error(`Error al consultar código de barras: ${error.message}`);
    if (!data) throw new NotFoundException(`No existe un portadosímetro con el código de barras '${barcode}'`);

    const activeAssembly = (data.holder_tld_assemblies ?? []).find((a: any) => a.is_active);

    return {
      ...data,
      active_assembly: activeAssembly
        ? {
            assembly_id: activeAssembly.id,
            assembled_at: activeAssembly.assembled_at,
            tld_card: activeAssembly.tld_cards,
          }
        : null,
    };
  }
}
