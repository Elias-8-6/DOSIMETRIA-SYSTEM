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
    // Consulta de asignaciones
    let assignmentsQuery = supabase
      .from('dosimeter_assignments')
      .select(
        orgType === 'client'
          ? `
        id, assigned_at, returned_at, status, notes, assigned_by,
        users:assigned_by(id, full_name, email),
        workers!inner(id, full_name, document_number, clients!inner(id, name, code), client_locations(id, name))
      `
          : `
        id, assigned_at, returned_at, status, notes, assigned_by,
        users:assigned_by(id, full_name, email),
        workers(id, full_name, document_number, clients(id, name, code), client_locations(id, name))
      `,
      )
      .eq('dosimeter_id', dosimeterId)
      .order('assigned_at', { ascending: false });

    if (orgType === 'client') {
      assignmentsQuery = assignmentsQuery.eq('workers.clients.organization_id', organizationId);
    }

    // Consulta de lecturas radiológicas
    let readingsQuery = supabase
      .from('dosimeter_readings')
      .select(
        orgType === 'client'
          ? `
        id, read_at, measured_dose, dose_unit, uncertainty,
        reading_status, hp10, hp007, background_dose, period_start, period_end,
        equipment(id, name, model),
        service_orders!inner(id, clients!inner(organization_id))
      `
          : `
        id, read_at, measured_dose, dose_unit, uncertainty,
        reading_status, hp10, hp007, background_dose, period_start, period_end,
        equipment(id, name, model),
        service_orders(id, order_number)
      `,
      )
      .eq('dosimeter_id', dosimeterId)
      .order('read_at', { ascending: false });

    if (orgType === 'client') {
      readingsQuery = readingsQuery.eq('service_orders.clients.organization_id', organizationId);
    }

    // Consulta de controles de contaminación
    const contaminationsQuery = supabase
      .from('contamination_checks')
      .select(
        `
        id, checked_at, result, measured_value, unit, observations,
        users:checked_by(id, full_name, email),
        equipment(id, name, model)
      `,
      )
      .eq('dosimeter_id', dosimeterId)
      .order('checked_at', { ascending: false });

    const [
      { data: assignments, error: assignmentsError },
      { data: readings, error: readingsError },
      { data: contaminations, error: contaminationsError },
    ] = await Promise.all([assignmentsQuery, readingsQuery, contaminationsQuery]);

    if (assignmentsError) {
      throw new Error('No se pudo obtener el historial de asignaciones');
    }
    if (readingsError) {
      throw new Error('No se pudo obtener el historial de lecturas');
    }
    if (contaminationsError) {
      throw new Error('No se pudo obtener el historial de chequeos de contaminación');
    }

    const assignmentsList = assignments ?? [];

    return {
      items: assignmentsList,
      assignments: assignmentsList,
      readings: readings ?? [],
      contaminations: contaminations ?? [],
    };
  }
}
