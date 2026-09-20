import { ForbiddenException, Injectable } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { OrganizationScopeService } from '@common/services/organization-scope.service';
import { sanitizeSearchTerm } from '@common/utils/search.util';

export type DosimeterOrigin = 'client' | 'unassigned' | 'laboratory' | 'other_client';

export interface SearchDosimeterResult {
  id: string;
  serial_number: string;
  internal_code: string | null;
  model: string | null;
  manufacturer: string | null;
  origin: DosimeterOrigin;
  dosimeter_type: {
    id: string;
    code: string;
    name: string;
    technology: string;
  } | null;
  status: {
    id: string;
    code: string;
    name: string;
  } | null;
  assigned_worker: {
    id: string;
    full_name: string;
    document_number: string | null;
  } | null;
}

@Injectable()
export class SearchDosimetersForOrderUseCase {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly orgScope: OrganizationScopeService,
  ) {}

  async execute(
    clientId: string,
    organizationId: string,
    searchTerm?: string,
  ): Promise<SearchDosimeterResult[]> {
    const orgType = await this.orgScope.getOrganizationType(organizationId);
    if (orgType === 'client') {
      const ownClientIds = await this.orgScope.getOwnClientIds(organizationId);
      if (!ownClientIds.includes(clientId)) {
        throw new ForbiddenException('No tiene acceso a los dosímetros de este cliente');
      }
    }

    const safeSearch = sanitizeSearchTerm(searchTerm);
    let query = this.supabase
      .getClient()
      .from('dosimeters')
      .select(
        `
        id,
        serial_number,
        internal_code,
        model,
        manufacturer,
        dosimeter_types(id, code, name, technology),
        dosimeter_statuses(id, code, name),
        dosimeter_assignments(
          id,
          status,
          assigned_at,
          returned_at,
          workers(
            id,
            client_id,
            full_name,
            document_number
          )
        )
      `,
      )
      .order('serial_number', { ascending: true })
      .limit(30);

    if (safeSearch) {
      query = query.or(`serial_number.ilike.%${safeSearch}%,internal_code.ilike.%${safeSearch}%`);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error('Error al buscar dosímetros para la orden');
    }

    const results: SearchDosimeterResult[] = [];
    for (const row of (data as any[] ?? [])) {
      const statusCode = row.dosimeter_statuses?.code;
      if (statusCode !== 'ASIGNADO') continue;

      const assignments = row.dosimeter_assignments ?? [];
      const activeAssignment = assignments.find(
        (a: any) =>
          (a.status === 'activo' || !a.returned_at) &&
          a.workers &&
          a.workers.client_id === clientId,
      );

      if (!activeAssignment || !activeAssignment.workers) continue;

      results.push({
        id: row.id,
        serial_number: row.serial_number,
        internal_code: row.internal_code,
        model: row.model,
        manufacturer: row.manufacturer,
        origin: 'client',
        dosimeter_type: row.dosimeter_types ?? null,
        status: row.dosimeter_statuses ?? null,
        assigned_worker: {
          id: activeAssignment.workers.id,
          full_name: activeAssignment.workers.full_name,
          document_number: activeAssignment.workers.document_number,
        },
      });
    }

    return results;
  }
}
