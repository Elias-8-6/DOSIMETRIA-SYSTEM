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

    const results: SearchDosimeterResult[] = (data as any[] ?? []).map((row) => {
      const assignments = row.dosimeter_assignments ?? [];
      const activeAssignment = assignments.find(
        (a: any) => a.status === 'activo' || !a.returned_at,
      );

      let origin: DosimeterOrigin = 'unassigned';
      let assigned_worker: { id: string; full_name: string; document_number: string | null } | null = null;

      if (activeAssignment?.workers) {
        assigned_worker = {
          id: activeAssignment.workers.id,
          full_name: activeAssignment.workers.full_name,
          document_number: activeAssignment.workers.document_number,
        };

        if (activeAssignment.workers.client_id === clientId) {
          origin = 'client';
        } else {
          origin = 'other_client';
        }
      } else if (
        row.dosimeter_types?.code === 'TLD_AREA' ||
        (row.internal_code && row.internal_code.startsWith('LAB-AREA'))
      ) {
        origin = 'laboratory';
      } else {
        origin = 'unassigned';
      }

      return {
        id: row.id,
        serial_number: row.serial_number,
        internal_code: row.internal_code,
        model: row.model,
        manufacturer: row.manufacturer,
        origin,
        dosimeter_type: row.dosimeter_types ?? null,
        status: row.dosimeter_statuses ?? null,
        assigned_worker,
      };
    });

    return results;
  }
}
