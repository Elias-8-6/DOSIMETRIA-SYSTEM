import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { OrganizationScopeService } from '@common/services/organization-scope.service';

@Injectable()
export class FindOneDosimeterUseCase {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly orgScope: OrganizationScopeService,
  ) {}

  async execute(dosimeterId: string, organizationId: string) {
    const supabase = this.supabase.getClient();

    // Sin el embed de dosimeter_assignments: se resuelve por separado más
    // abajo, ya con el filtro por organización aplicado cuando corresponde.
    // Traerlo embebido aquí obligaría a usar !inner para filtrar por
    // organización, y eso colapsaría este registro entero (falso 404) si el
    // dosímetro no tiene una asignación abierta que matchee el filtro.
    const { data, error } = await supabase
      .from('dosimeters')
      .select(
        `
        id, serial_number, internal_code, lot_number,
        manufacture_date, commissioning_date, wear_period_days,
        max_dose_limit, last_annealing_date, current_condition,
        reusable, notes, created_at,
        dosimeter_types(id, code, name, technology),
        dosimeter_statuses(id, code, name)
      `,
      )
      .eq('id', dosimeterId)
      .maybeSingle();

    if (error) throw new Error('Error al obtener el dosímetro');
    if (!data) throw new NotFoundException('Dosímetro no encontrado');

    const orgType = await this.orgScope.getOrganizationType(organizationId);
    if (orgType === 'client') {
      const allowed = await this.orgScope.isDosimeterAllowedForClientOrg(
        dosimeterId,
        organizationId,
      );
      if (!allowed) throw new NotFoundException('Dosímetro no encontrado');
    }

    // Asignación abierta actual, filtrada por organización cuando el
    // llamante es tipo client -- una organización no debe ver el trabajador
    // (nombre/documento) al que el dosímetro está asignado actualmente en
    // OTRA organización, aunque alguna vez lo haya tenido ella misma.
    let assignmentQuery = supabase
      .from('dosimeter_assignments')
      .select(
        orgType === 'client'
          ? `
        id, assigned_at, returned_at, status, notes,
        workers!inner(id, full_name, document_number, clients!inner(id, name, code))
      `
          : `
        id, assigned_at, returned_at, status, notes,
        workers(id, full_name, document_number, clients(id, name, code))
      `,
      )
      .eq('dosimeter_id', dosimeterId)
      .is('returned_at', null);

    if (orgType === 'client') {
      assignmentQuery = assignmentQuery.eq('workers.clients.organization_id', organizationId);
    }

    const { data: openAssignment, error: assignmentError } = await assignmentQuery;
    if (assignmentError) throw new Error('Error al obtener la asignación del dosímetro');

    return { ...data, dosimeter_assignments: openAssignment ?? [] };
  }
}
