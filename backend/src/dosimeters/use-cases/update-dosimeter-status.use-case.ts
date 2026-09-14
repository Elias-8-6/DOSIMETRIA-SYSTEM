import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

    if (dto.status === 'ASIGNADO') {
      throw new BadRequestException(
        'No se puede cambiar el estado a ASIGNADO manualmente. Asigne el dosímetro mediante la opción de asignación vinculándolo a un trabajador.',
      );
    }

    const supabase = this.supabase.getClient();

    const { data: existing } = await supabase
      .from('dosimeters')
      .select('id, dosimeter_statuses(code)')
      .eq('id', dosimeterId)
      .maybeSingle();

    if (!existing) throw new NotFoundException('Dosímetro no encontrado');

    const { data: openAssignment } = await supabase
      .from('dosimeter_assignments')
      .select('id, notes')
      .eq('dosimeter_id', dosimeterId)
      .is('returned_at', null)
      .maybeSingle();

    if (openAssignment && dto.status === 'DISPONIBLE') {
      throw new ConflictException(
        'No se puede cambiar el estado a DISPONIBLE porque el dosímetro tiene una asignación activa. Debe registrar la devolución formal del dosímetro.',
      );
    }

    // Si pasa a BAJA o INCIDENTE teniendo asignación abierta, se cierra formalmente la asignación
    if (openAssignment && (dto.status === 'BAJA' || dto.status === 'INCIDENTE')) {
      const today = new Date().toISOString().slice(0, 10);
      const closeReason = `Cierre automático por cambio de estado del dosímetro a ${dto.status}`;
      const updatedNotes = openAssignment.notes
        ? `${openAssignment.notes} | ${closeReason}`
        : closeReason;

      const { error: closeError } = await supabase
        .from('dosimeter_assignments')
        .update({
          returned_at: today,
          status: 'cerrado',
          notes: updatedNotes,
        })
        .eq('id', openAssignment.id);

      if (closeError) {
        throw new Error('No se pudo cerrar la asignación activa del dosímetro');
      }

      await this.audit.log({
        userId: requestingUserId,
        entityName: 'dosimeter_assignments',
        entityId: openAssignment.id,
        action: 'UPDATE',
        oldValues: { returned_at: null, status: 'activo' },
        newValues: { returned_at: today, status: 'cerrado', notes: updatedNotes },
      });
    }

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
