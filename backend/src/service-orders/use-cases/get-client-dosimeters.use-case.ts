import { ForbiddenException, Injectable } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { OrganizationScopeService } from '@common/services/organization-scope.service';

export interface ClientDosimeterItem {
  dosimeter_id: string;
  serial_number: string;
  internal_code: string | null;
  model: string | null;
  manufacturer: string | null;
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
  worker: {
    id: string;
    full_name: string;
    document_number: string | null;
  } | null;
}

@Injectable()
export class GetClientDosimetersUseCase {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly orgScope: OrganizationScopeService,
  ) {}

  async execute(clientId: string, organizationId: string): Promise<ClientDosimeterItem[]> {
    const orgType = await this.orgScope.getOrganizationType(organizationId);
    if (orgType === 'client') {
      const ownClientIds = await this.orgScope.getOwnClientIds(organizationId);
      if (!ownClientIds.includes(clientId)) {
        throw new ForbiddenException('No tiene acceso a los dosímetros de este cliente');
      }
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('dosimeter_assignments')
      .select(
        `
        id,
        dosimeter_id,
        status,
        assigned_at,
        returned_at,
        dosimeters!inner(
          id,
          serial_number,
          internal_code,
          model,
          manufacturer,
          dosimeter_types(id, code, name, technology),
          dosimeter_statuses(id, code, name)
        ),
        workers!inner(
          id,
          client_id,
          full_name,
          document_number
        )
      `,
      )
      .eq('workers.client_id', clientId)
      .or('returned_at.is.null,status.eq.activo');

    if (error) {
      throw new Error('Error al consultar los dosímetros del cliente');
    }

    const unique = new Map<string, ClientDosimeterItem>();
    for (const row of (data as any[]) ?? []) {
      if (!unique.has(row.dosimeter_id)) {
        unique.set(row.dosimeter_id, {
          dosimeter_id: row.dosimeter_id,
          serial_number: row.dosimeters?.serial_number,
          internal_code: row.dosimeters?.internal_code,
          model: row.dosimeters?.model,
          manufacturer: row.dosimeters?.manufacturer,
          dosimeter_type: row.dosimeters?.dosimeter_types ?? null,
          status: row.dosimeters?.dosimeter_statuses ?? null,
          worker: row.workers ?? null,
        });
      }
    }

    return Array.from(unique.values());
  }
}
