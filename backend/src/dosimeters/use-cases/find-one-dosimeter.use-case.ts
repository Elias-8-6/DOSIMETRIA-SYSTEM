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
    const { data, error } = await this.supabase
      .getClient()
      .from('dosimeters')
      .select(
        `
        id, serial_number, internal_code, lot_number,
        manufacture_date, commissioning_date, wear_period_days,
        max_dose_limit, last_annealing_date, current_condition,
        reusable, notes, created_at,
        dosimeter_types(id, code, name, technology),
        dosimeter_statuses(id, code, name),
        dosimeter_assignments(
          id, assigned_at, returned_at, status, notes,
          workers(id, full_name, document_number, clients(id, name, code))
        )
      `,
      )
      .eq('id', dosimeterId)
      .is('dosimeter_assignments.returned_at', null)
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

    return data;
  }
}
