import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AuditService } from '@common/services/audit.service';
import { OrganizationScopeService } from '@common/services/organization-scope.service';
import { UpdateReceptionDto } from '../dto/update-reception.dto';

@Injectable()
export class UpdateReceptionUseCase {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
    private readonly orgScope: OrganizationScopeService,
  ) {}

  async execute(
    receptionId: string,
    dto: UpdateReceptionDto,
    organizationId: string,
    requestingUserId: string,
  ) {
    const orgType = await this.orgScope.getOrganizationType(organizationId);
    if (orgType !== 'laboratory') {
      throw new ForbiddenException('Solo el laboratorio puede modificar una recepción');
    }

    const client = this.supabase.getClient();

    const { data: existing, error: findError } = await client
      .from('receptions')
      .select('id, reception_code, packaging_condition, observations')
      .eq('id', receptionId)
      .maybeSingle();

    if (findError || !existing) {
      throw new NotFoundException('Recepción no encontrada');
    }

    const updates: Record<string, unknown> = {};
    if (dto.packaging_condition !== undefined) {
      updates.packaging_condition = dto.packaging_condition;
    }
    if (dto.observations !== undefined) {
      updates.observations = dto.observations;
    }

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('No se han proporcionado cambios');
    }

    const { data, error } = await client
      .from('receptions')
      .update(updates)
      .eq('id', receptionId)
      .select('id, reception_code, packaging_condition, observations')
      .single();

    if (error) {
      throw new Error('No se pudo actualizar la recepción');
    }

    await this.audit.log({
      userId: requestingUserId,
      entityName: 'receptions',
      entityId: receptionId,
      action: 'UPDATE',
      oldValues: {
        packaging_condition: existing.packaging_condition,
        observations: existing.observations,
      },
      newValues: updates,
    });

    return data;
  }
}
