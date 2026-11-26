import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { OrganizationScopeService } from '@common/services/organization-scope.service';
import { sanitizeSearchTerm } from '@common/utils/search.util';
import { normalizePagination } from '@common/utils/pagination.util';
import { isMissingBarcodeColumnError } from '../utils/barcode-column.util';

const SELECT_FIELDS = `
  id, serial_number, barcode, internal_code, lot_number,
  manufacture_date, commissioning_date, wear_period_days,
  max_dose_limit, last_annealing_date, current_condition,
  reusable, notes, model, manufacturer, photo_url, created_at,
  dosimeter_types(id, code, name, technology),
  dosimeter_statuses(id, code, name)
`;

const FALLBACK_SELECT_FIELDS = `
  id, serial_number, internal_code, lot_number,
  manufacture_date, commissioning_date, wear_period_days,
  max_dose_limit, last_annealing_date, current_condition,
  reusable, notes, model, manufacturer, photo_url, created_at,
  dosimeter_types(id, code, name, technology),
  dosimeter_statuses(id, code, name)
`;

export interface PaginatedDosimetersResult {
  items: unknown[];
  total: number;
}

@Injectable()
export class FindAllDosimetersUseCase {
  private readonly logger = new Logger(FindAllDosimetersUseCase.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly orgScope: OrganizationScopeService,
  ) {}

  async execute(
    organizationId: string,
    search?: string,
    dosimeterTypeId?: string,
    statusCode?: string,
    currentCondition?: string,
    page: number = 1,
    limit: number = 10,
    barcode?: string,
  ): Promise<PaginatedDosimetersResult> {
    const orgType = await this.orgScope.getOrganizationType(organizationId);

    let allowedIds: string[] | null = null;
    if (orgType === 'client') {
      allowedIds = await this.orgScope.getAllowedDosimeterIds(organizationId);
      if (allowedIds.length === 0) {
        return { items: [], total: 0 };
      }
    }

    const { from, to } = normalizePagination(page, limit);
    const safeSearch = sanitizeSearchTerm(search);

    const buildQuery = (selectFields: string, includeBarcodeFilter: boolean) => {
      let query = this.supabase
        .getClient()
        .from('dosimeters')
        .select(
          statusCode
            ? selectFields.replace('dosimeter_statuses(', 'dosimeter_statuses!inner(')
            : selectFields,
          { count: 'exact' },
        )
        .order('created_at', { ascending: false });

      if (allowedIds) query = query.in('id', allowedIds);
      if (dosimeterTypeId) query = query.eq('dosimeter_type_id', dosimeterTypeId);
      if (statusCode) query = query.eq('dosimeter_statuses.code', statusCode);
      if (currentCondition) query = query.eq('current_condition', currentCondition);
      if (barcode) {
        query = includeBarcodeFilter
          ? query.eq('barcode', barcode.trim())
          : query.eq('serial_number', barcode.trim());
      }
      if (safeSearch) {
        if (includeBarcodeFilter) {
          query = query.or(
            `serial_number.ilike.%${safeSearch}%,barcode.ilike.%${safeSearch}%,internal_code.ilike.%${safeSearch}%,lot_number.ilike.%${safeSearch}%,model.ilike.%${safeSearch}%,manufacturer.ilike.%${safeSearch}%`,
          );
        } else {
          query = query.or(
            `serial_number.ilike.%${safeSearch}%,internal_code.ilike.%${safeSearch}%,lot_number.ilike.%${safeSearch}%,model.ilike.%${safeSearch}%,manufacturer.ilike.%${safeSearch}%`,
          );
        }
      }

      query = query.range(from, to);
      return query;
    };

    let { data, error, count } = await buildQuery(SELECT_FIELDS, true);

    // Fallback de retrocompatibilidad en caso de que la columna 'barcode' aún no exista en BD
    if (error && isMissingBarcodeColumnError(error)) {
      this.logger.warn(
        `Columna 'barcode' no encontrada en dosimeters (código ${error.code}). Ejecutando consulta de retrocompatibilidad.`,
      );
      const fallbackResult = await buildQuery(FALLBACK_SELECT_FIELDS, false);
      if (!fallbackResult.error) {
        data = (fallbackResult.data ?? []).map((row: any) => ({
          ...row,
          barcode: row.serial_number,
        }));
        count = fallbackResult.count;
        error = null;
      } else {
        error = fallbackResult.error;
      }
    }

    if (error) {
      this.logger.error('Error al obtener el listado de dosímetros:', error);
      throw new Error('No se pudo obtener el listado de dosímetros');
    }

    return {
      items: data ?? [],
      total: count ?? 0,
    };
  }
}
