import { Injectable } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { OrganizationScopeService } from '@common/services/organization-scope.service';
import { sanitizeSearchTerm } from '@common/utils/search.util';
import { normalizePagination } from '@common/utils/pagination.util';

const SELECT_FIELDS = `
  id, serial_number, internal_code, lot_number,
  manufacture_date, commissioning_date, wear_period_days,
  max_dose_limit, last_annealing_date, current_condition,
  reusable, notes, created_at,
  dosimeter_types(id, code, name, technology),
  dosimeter_statuses(id, code, name)
`;

@Injectable()
export class FindAllDosimetersUseCase {
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
  ) {
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

    let query = this.supabase
      .getClient()
      .from('dosimeters')
      .select(
        statusCode
          ? SELECT_FIELDS.replace('dosimeter_statuses(', 'dosimeter_statuses!inner(')
          : SELECT_FIELDS,
        { count: 'exact' },
      )
      .order('created_at', { ascending: false });

    if (allowedIds) query = query.in('id', allowedIds);
    if (dosimeterTypeId) query = query.eq('dosimeter_type_id', dosimeterTypeId);
    if (statusCode) query = query.eq('dosimeter_statuses.code', statusCode);
    if (currentCondition) query = query.eq('current_condition', currentCondition);
    if (safeSearch) {
      query = query.or(
        `serial_number.ilike.%${safeSearch}%,internal_code.ilike.%${safeSearch}%,lot_number.ilike.%${safeSearch}%`,
      );
    }

    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw new Error('No se pudo obtener el listado de dosímetros');

    return {
      items: data ?? [],
      total: count ?? 0,
    };
  }
}
