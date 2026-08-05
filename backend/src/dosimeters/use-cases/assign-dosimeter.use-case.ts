import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AuditService } from '@common/services/audit.service';
import { OrganizationScopeService } from '@common/services/organization-scope.service';
import { AssignDosimeterDto } from '../dto/assign-dosimeter.dto';

@Injectable()
export class AssignDosimeterUseCase {
  private readonly logger = new Logger(AssignDosimeterUseCase.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
    private readonly orgScope: OrganizationScopeService,
  ) {}

  async execute(
    dosimeterId: string,
    dto: AssignDosimeterDto,
    organizationId: string,
    requestingUserId: string,
  ) {
    const orgType = await this.orgScope.getOrganizationType(organizationId);
    if (orgType !== 'laboratory') {
      throw new ForbiddenException('Solo el laboratorio puede asignar dosímetros');
    }

    const supabase = this.supabase.getClient();

    const { data: dosimeter } = await supabase
      .from('dosimeters')
      .select('id')
      .eq('id', dosimeterId)
      .maybeSingle();
    if (!dosimeter) throw new NotFoundException('Dosímetro no encontrado');

    const { data: worker } = await supabase
      .from('workers')
      .select('id')
      .eq('id', dto.worker_id)
      .maybeSingle();
    if (!worker) throw new NotFoundException('Trabajador no encontrado');

    const { data: openAssignment } = await supabase
      .from('dosimeter_assignments')
      .select('id')
      .eq('dosimeter_id', dosimeterId)
      .is('returned_at', null)
      .maybeSingle();

    if (openAssignment) {
      throw new ConflictException('El dosímetro ya tiene una asignación abierta');
    }

    const { data: assignedStatus, error: statusError } = await supabase
      .from('dosimeter_statuses')
      .select('id')
      .eq('code', 'ASIGNADO')
      .single();

    if (statusError || !assignedStatus) {
      throw new Error('No se pudo resolver el estado ASIGNADO');
    }

    const { error: statusUpdateError } = await supabase
      .from('dosimeters')
      .update({ status_id: assignedStatus.id })
      .eq('id', dosimeterId);

    if (statusUpdateError) {
      throw new Error('No se pudo actualizar el estado del dosímetro');
    }

    const { data: newAssignment, error: assignError } = await supabase
      .from('dosimeter_assignments')
      .insert({
        dosimeter_id: dosimeterId,
        worker_id: dto.worker_id,
        assigned_at: dto.assigned_at,
        notes: dto.notes ?? null,
        status: 'activo',
        assigned_by: requestingUserId,
      })
      .select('id, dosimeter_id, worker_id, assigned_at, status, notes')
      .single();

    if (assignError || !newAssignment) {
      this.logger.error('Error al crear la asignación, revirtiendo estado del dosímetro', assignError);
      const { data: previousStatus } = await supabase
        .from('dosimeter_statuses')
        .select('id')
        .eq('code', 'DISPONIBLE')
        .single();
      if (previousStatus) {
        await supabase.from('dosimeters').update({ status_id: previousStatus.id }).eq('id', dosimeterId);
      }
      throw new Error('No se pudo asignar el dosímetro');
    }

    await this.audit.log({
      userId: requestingUserId,
      entityName: 'dosimeter_assignments',
      entityId: newAssignment.id,
      action: 'CREATE',
      newValues: {
        dosimeter_id: dosimeterId,
        worker_id: dto.worker_id,
        assigned_at: dto.assigned_at,
        resulting_status: 'ASIGNADO',
      },
    });

    return newAssignment;
  }
}
