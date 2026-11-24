import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { sanitizeSearchTerm } from '@common/utils/search.util';
import { normalizePagination } from '@common/utils/pagination.util';
import { QueryHoldersDto } from '../dto/query-holders.dto';

export interface HolderAssemblyRow {
  id: string;
  is_active: boolean;
  assembled_at: string;
  tld_cards?: Record<string, unknown> | null;
  dosimeters?: Record<string, unknown> | null;
}

export interface HolderRow {
  id: string;
  barcode: string;
  serial_number: string;
  holder_tld_assemblies?: HolderAssemblyRow[];
  [key: string]: unknown;
}

@Injectable()
export class FindHoldersUseCase {
  private readonly logger = new Logger(FindHoldersUseCase.name);

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
        id, barcode, serial_number, holder_color, clip_type, model, storage_location,
        current_condition, status, notes, photo_url, created_at, updated_at,
        holder_tld_assemblies(
          id, is_active, assembled_at,
          tld_cards(id, serial_number, elements_count, tld_material, status),
          dosimeters(id, serial_number, current_condition, model)
        )
      `,
        { count: 'exact' },
      )
      .order('barcode', { ascending: true });

    if (query.barcode) {
      dbQuery = dbQuery.eq('barcode', query.barcode.trim());
    }
    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status);
    }
    if (query.current_condition) {
      dbQuery = dbQuery.eq('current_condition', query.current_condition);
    }
    if (safeSearch) {
      dbQuery = dbQuery.or(
        `barcode.ilike.%${safeSearch}%,serial_number.ilike.%${safeSearch}%`,
      );
    }

    dbQuery = dbQuery.range(from, to);

    const { data, error, count } = await dbQuery;
    if (error) {
      this.logger.error('Error al listar portadosímetros:', error);
      throw new Error(`Error al listar portadosímetros: ${error.message}`);
    }

    const items = ((data as unknown as HolderRow[]) ?? []).map((h: HolderRow) => {
      const activeAssembly = (h.holder_tld_assemblies ?? []).find((a: HolderAssemblyRow) => a.is_active);
      return {
        ...h,
        active_assembly: activeAssembly
          ? {
              assembly_id: activeAssembly.id,
              assembled_at: activeAssembly.assembled_at,
              tld_card: activeAssembly.tld_cards,
              dosimeter: activeAssembly.dosimeters,
            }
          : null,
      };
    });

    return { items, total: count ?? 0 };
  }

  async findByBarcode(barcode: string) {
    const safeBarcode = barcode.trim();
    const supabase = this.supabase.getClient();

    const { data, error } = await supabase
      .from('holder_dosimeters')
      .select(
        `
        id, barcode, serial_number, holder_color, clip_type, model, storage_location,
        current_condition, status, notes, photo_url, created_at, updated_at,
        holder_tld_assemblies(
          id, is_active, assembled_at,
          tld_cards(id, serial_number, elements_count, tld_material, status),
          dosimeters(id, serial_number, current_condition, model)
        )
      `,
      )
      .eq('barcode', safeBarcode)
      .maybeSingle();

    if (error) {
      this.logger.error(`Error al buscar portadosímetro por barcode '${safeBarcode}':`, error);
      throw new Error(`Error al buscar portadosímetro: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException(`Portadosímetro con código de barras '${safeBarcode}' no encontrado`);
    }

    const holderData = data as unknown as HolderRow;
    const activeAssembly = (holderData.holder_tld_assemblies ?? []).find((a: HolderAssemblyRow) => a.is_active);
    return {
      ...holderData,
      active_assembly: activeAssembly
        ? {
            assembly_id: activeAssembly.id,
            assembled_at: activeAssembly.assembled_at,
            tld_card: activeAssembly.tld_cards,
            dosimeter: activeAssembly.dosimeters,
          }
        : null,
    };
  }
}
