import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AuditService } from '@common/services/audit.service';
import { OrganizationScopeService } from '@common/services/organization-scope.service';
import { ReturnDosimeterDto } from '../dto/return-dosimeter.dto';

@Injectable()
export class ReturnDosimeterUseCase {
  private readonly logger = new Logger(ReturnDosimeterUseCase.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
    private readonly orgScope: OrganizationScopeService,
  ) {}

  async execute(
    dosimeterId: string,
    dto: ReturnDosimeterDto,
    organizationId: string,
    requestingUserId: string,
  ) {
    const orgType = await this.orgScope.getOrganizationType(organizationId);
    if (orgType !== 'laboratory') {
      throw new ForbiddenException('Solo el laboratorio puede registrar devoluciones');
    }

    const supabase = this.supabase.getClient();

    const { data: openAssignment } = await supabase
      .from('dosimeter_assignments')
      .select('id, holder_id, notes')
      .eq('dosimeter_id', dosimeterId)
      .is('returned_at', null)
      .maybeSingle();

    if (!openAssignment) {
      throw new NotFoundException('No hay una asignación abierta para este dosímetro');
    }

    const { data: availableStatus, error: statusError } = await supabase
      .from('dosimeter_statuses')
      .select('id')
      .eq('code', 'DISPONIBLE')
      .single();

    if (statusError || !availableStatus) {
      throw new Error('No se pudo resolver el estado DISPONIBLE');
    }

    const { error: dosimeterUpdateError } = await supabase
      .from('dosimeters')
      .update({
        status_id: availableStatus.id,
        ...(dto.current_condition !== undefined && { current_condition: dto.current_condition }),
      })
      .eq('id', dosimeterId);

    if (dosimeterUpdateError) {
      throw new Error('No se pudo actualizar el estado del dosímetro');
    }

    const { data: closedAssignment, error: assignmentError } = await supabase
      .from('dosimeter_assignments')
      .update({
        returned_at: dto.returned_at,
        status: 'cerrado',
        notes: dto.notes ?? openAssignment.notes,
      })
      .eq('id', openAssignment.id)
      .select('id, dosimeter_id, holder_id, worker_id, assigned_at, returned_at, status, notes')
      .single();

    if (assignmentError || !closedAssignment) {
      this.logger.error('Error al cerrar la asignación tras actualizar el dosímetro', assignmentError);
      throw new Error('No se pudo registrar la devolución');
    }

    // Actualizar estado del portadosímetro si estaba registrado
    const holderId = openAssignment.holder_id;
    if (holderId) {
      let holderStatus = 'ensamblado';
      let holderCondition: string | null = null;

      if (dto.current_condition === 'perdido') {
        holderStatus = 'baja';
        holderCondition = 'perdido';

        // Desactivar el ensamble activo para que el dosímetro liberado no quede bloqueado
        await supabase
          .from('holder_tld_assemblies')
          .update({
            is_active: false,
            disassembled_at: dto.returned_at,
            disassembled_by: requestingUserId,
            notes: 'Desensamble automático por reporte de pérdida/extravío en devolución',
          })
          .eq('holder_id', holderId)
          .eq('is_active', true);
      } else if (dto.current_condition === 'danado') {
        holderStatus = 'en_triaje';
        holderCondition = 'danado_grave';
      } else if (dto.current_condition === 'contaminado') {
        holderStatus = 'en_triaje';
        holderCondition = 'contaminado';
      }

      const holderUpdatePayload: Record<string, any> = { status: holderStatus };
      if (holderCondition) {
        holderUpdatePayload.current_condition = holderCondition;
      }

      await supabase
        .from('holder_dosimeters')
        .update(holderUpdatePayload)
        .eq('id', holderId);
    }

    await this.audit.log({
      userId: requestingUserId,
      entityName: 'dosimeter_assignments',
      entityId: closedAssignment.id,
      action: 'UPDATE',
      oldValues: { returned_at: null, status: 'activo' },
      newValues: { returned_at: dto.returned_at, status: 'cerrado', holder_id: holderId },
    });

    return closedAssignment;
  }
}
