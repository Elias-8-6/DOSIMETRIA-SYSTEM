import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { OrganizationScopeService } from '@common/services/organization-scope.service';

@Injectable()
export class GetDosimeterHistoryUseCase {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly orgScope: OrganizationScopeService,
  ) {}

  async execute(dosimeterId: string, organizationId: string) {
    const supabase = this.supabase.getClient();

    const { data: dosimeter } = await supabase
      .from('dosimeters')
      .select('id')
      .eq('id', dosimeterId)
      .maybeSingle();
    if (!dosimeter) throw new NotFoundException('Dosímetro no encontrado');

    const orgType = await this.orgScope.getOrganizationType(organizationId);
    if (orgType === 'client') {
      const allowed = await this.orgScope.isDosimeterAllowedForClientOrg(
        dosimeterId,
        organizationId,
      );
      if (!allowed) throw new NotFoundException('Dosímetro no encontrado');
    }

    // Una organización cliente solo puede ver las filas de historial que
    // corresponden a sus propios trabajadores -- isDosimeterAllowedForClientOrg
    // solo valida que "alguna vez" tuvo el dosímetro, no filtra los datos de
    // OTRAS organizaciones que también lo tuvieron. El join !inner aquí es
    // seguro porque esta es una query hoja sobre dosimeter_assignments, no un
    // embed bajo dosimeters -- filtrar filas no colapsa ningún registro padre.
    let query = supabase
      .from('dosimeter_assignments')
      .select(
        orgType === 'client'
          ? `
        id, assigned_at, returned_at, status, notes, assigned_by,
        workers!inner(id, full_name, document_number, clients!inner(id, name, code))
      `
          : `
        id, assigned_at, returned_at, status, notes, assigned_by,
        workers(id, full_name, document_number, clients(id, name, code))
      `,
      )
      .eq('dosimeter_id', dosimeterId)
      .order('assigned_at', { ascending: false });

    if (orgType === 'client') {
      query = query.eq('workers.clients.organization_id', organizationId);
    }

    const { data, error } = await query;

    if (error) throw new Error('No se pudo obtener el historial de asignaciones');

    return { items: data ?? [] };
  }
}
