import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AuditService } from '@common/services/audit.service';
import { OrganizationScopeService } from '@common/services/organization-scope.service';
import { UpdateDosimeterStatusDto } from '../dto/update-dosimeter-status.dto';

@Injectable()
export class UpdateDosimeterStatusUseCase {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
    private readonly orgScope: OrganizationScopeService,
  ) {}

  async execute(
    dosimeterId: string,
    dto: UpdateDosimeterStatusDto,
    organizationId: string,
    requestingUserId: string,
  ) {
    const orgType = await this.orgScope.getOrganizationType(organizationId);
    if (orgType !== 'laboratory') {
      throw new ForbiddenException('Solo el laboratorio puede cambiar el estado de un dosímetro');
    }

    const supabase = this.supabase.getClient();

    const { data: existing } = await supabase
      .from('dosimeters')
      .select('id, dosimeter_statuses(code)')
      .eq('id', dosimeterId)
      .maybeSingle();

    if (!existing) throw new NotFoundException('Dosímetro no encontrado');

    const { data: newStatus, error: statusError } = await supabase
      .from('dosimeter_statuses')
      .select('id')
      .eq('code', dto.status)
      .single();

    if (statusError || !newStatus) {
      throw new Error(`No se pudo resolver el estado '${dto.status}'`);
    }

    const { data, error } = await supabase
      .from('dosimeters')
      .update({ status_id: newStatus.id })
      .eq('id', dosimeterId)
      .select('id, serial_number, dosimeter_statuses(code, name)')
      .single();

    if (error) throw new Error(error.message);

    const oldStatus = (existing.dosimeter_statuses as unknown as { code: string } | null)?.code;

    await this.audit.log({
      userId: requestingUserId,
      entityName: 'dosimeters',
      entityId: dosimeterId,
      action: 'STATUS_CHANGE',
      oldValues: { status: oldStatus ?? null },
      newValues: { status: dto.status },
    });

    return data;
  }
}
