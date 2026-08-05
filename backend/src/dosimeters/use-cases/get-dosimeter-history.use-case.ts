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

    const { data, error } = await supabase
      .from('dosimeter_assignments')
      .select(
        `
        id, assigned_at, returned_at, status, notes, assigned_by,
        workers(id, full_name, document_number, clients(id, name, code))
      `,
      )
      .eq('dosimeter_id', dosimeterId)
      .order('assigned_at', { ascending: false });

    if (error) throw new Error('No se pudo obtener el historial de asignaciones');

    return { items: data ?? [] };
  }
}
