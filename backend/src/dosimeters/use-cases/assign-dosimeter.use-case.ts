import {
  BadRequestException,
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

    // 1. Validar dosímetro y su tipología normativa
    const { data: dosimeter } = await supabase
      .from('dosimeters')
      .select('id, serial_number, current_condition, dosimeter_types(code, name)')
      .eq('id', dosimeterId)
      .maybeSingle();

    if (!dosimeter) throw new NotFoundException('Dosímetro no encontrado');

    const typeCode = (dosimeter.dosimeter_types as { code?: string } | null)?.code;

    // Regla de Negocio: CONTROL_ENVIO_VIAJERO no se asigna a trabajadores (es control ambiental)
    if (typeCode === 'CONTROL_ENVIO_VIAJERO') {
      throw new BadRequestException(
        'Un dosímetro de tipo CONTROL_ENVIO_VIAJERO no puede asignarse a un trabajador. Su función es control de fondo en lote.',
      );
    }

    // Regla de Negocio: CONTROL_CALIBRACION es de uso exclusivo en laboratorio (UCR/CICAM)
    if (typeCode === 'CONTROL_CALIBRACION') {
      throw new BadRequestException(
        'Un dosímetro de tipo CONTROL_CALIBRACION no puede asignarse a un trabajador. Su uso es exclusivo de calibración.',
      );
    }

    // 2. Validar trabajador y su aptitud médica Minsa
    const { data: worker } = await supabase
      .from('workers')
      .select('id, full_name, medical_status, minsa_exam_expiry_date')
      .eq('id', dto.worker_id)
      .maybeSingle();

    if (!worker) throw new NotFoundException('Trabajador no encontrado');

    if (worker.medical_status === 'vencido' || worker.medical_status === 'no_apto') {
      throw new ConflictException(
        `El trabajador '${worker.full_name}' no puede recibir dosímetros: examen médico Minsa ${worker.medical_status.toUpperCase()}.`,
      );
    }

    if (worker.minsa_exam_expiry_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiry = new Date(worker.minsa_exam_expiry_date);
      if (expiry.getTime() < today.getTime()) {
        throw new ConflictException(
          `El trabajador '${worker.full_name}' tiene el examen médico Minsa vencido desde ${worker.minsa_exam_expiry_date}. Asignación bloqueada por regulación.`,
        );
      }
    }

    // 3. Validar asignación abierta previa
    const { data: openAssignment } = await supabase
      .from('dosimeter_assignments')
      .select('id')
      .eq('dosimeter_id', dosimeterId)
      .is('returned_at', null)
      .maybeSingle();

    if (openAssignment) {
      throw new ConflictException('El dosímetro ya tiene una asignación abierta');
    }

    // 4. VALIDACIÓN DE PORTADOSÍMETRO (HOLDER) ENSAMBLADO
    let activeHolder: {
      id: string;
      barcode: string;
      serial_number: string;
      status: string;
      current_condition: string;
    } | null = null;
    let expressCreatedAssemblyId: string | null = null;

    // 4.1 Si se envió holder_barcode o holder_id (Ensamble Express con Escáner o asignación guiada)
    if (dto.holder_barcode || dto.holder_id) {
      let holderQuery = supabase
        .from('holder_dosimeters')
        .select('id, barcode, serial_number, status, current_condition');

      if (dto.holder_id) {
        holderQuery = holderQuery.eq('id', dto.holder_id);
      } else if (dto.holder_barcode) {
        holderQuery = holderQuery.eq('barcode', dto.holder_barcode.trim());
      }

      const { data: scannedHolder } = await holderQuery.maybeSingle();

      if (!scannedHolder) {
        throw new NotFoundException(
          `Portadosímetro '${dto.holder_barcode ?? dto.holder_id}' no encontrado en el sistema.`,
        );
      }

      // Validar si el dosímetro ya tiene un ensamble activo en otro portadosímetro
      const { data: activeAsmForDosimeter } = await supabase
        .from('holder_tld_assemblies')
        .select('id, holder_id')
        .eq('dosimeter_id', dosimeterId)
        .eq('is_active', true)
        .maybeSingle();

      if (activeAsmForDosimeter && activeAsmForDosimeter.holder_id !== scannedHolder.id) {
        throw new ConflictException(
          `El dosímetro '${dosimeter.serial_number}' ya se encuentra ensamblado a otro portadosímetro. Debe desensamblarlo antes de reasignarlo.`,
        );
      }

      const { data: existingAssemblyForScanned } = await supabase
        .from('holder_tld_assemblies')
        .select('id, dosimeter_id')
        .eq('holder_id', scannedHolder.id)
        .eq('is_active', true)
        .maybeSingle();

      if (existingAssemblyForScanned) {
        if (existingAssemblyForScanned.dosimeter_id && existingAssemblyForScanned.dosimeter_id !== dosimeterId) {
          throw new ConflictException(
            `El portadosímetro '${scannedHolder.barcode}' ya se encuentra ensamblado a otro dosímetro.`,
          );
        }
        // Si el portadosímetro ya estaba ensamblado a una tarjeta TLD sin dosimeter_id explícito, vincular el dosimeter_id
        if (!existingAssemblyForScanned.dosimeter_id) {
          await supabase
            .from('holder_tld_assemblies')
            .update({ dosimeter_id: dosimeterId })
            .eq('id', existingAssemblyForScanned.id);
        }
        activeHolder = scannedHolder;
      } else {
        if (scannedHolder.status !== 'disponible') {
          throw new ConflictException(
            `El portadosímetro '${scannedHolder.barcode}' no está disponible (estado actual: ${scannedHolder.status}).`,
          );
        }

        const { data: newAssembly, error: newAssemblyErr } = await supabase
          .from('holder_tld_assemblies')
          .insert({
            holder_id: scannedHolder.id,
            dosimeter_id: dosimeterId,
            assembled_by: requestingUserId,
            is_active: true,
            notes: 'Ensamble express automático al asignar dosímetro a POE',
          })
          .select('id')
          .single();

        if (newAssemblyErr || !newAssembly) {
          this.logger.error('Error al crear ensamble en caliente:', newAssemblyErr);
          if (newAssemblyErr?.code === '23505') {
            throw new ConflictException('Conflicto: El dosímetro o portadosímetro ya cuenta con un ensamble activo.');
          }
          throw new Error('No se pudo vincular el portadosímetro al dosímetro.');
        }

        expressCreatedAssemblyId = newAssembly.id;
        activeHolder = scannedHolder;
      }
    } else {
      // 4.2 Buscar si el dosímetro ya tiene un ensamble activo
      const { data: existingAssembly } = await supabase
        .from('holder_tld_assemblies')
        .select('id, holder_id, is_active')
        .eq('dosimeter_id', dosimeterId)
        .eq('is_active', true)
        .maybeSingle();

      if (existingAssembly?.holder_id) {
        const { data: h } = await supabase
          .from('holder_dosimeters')
          .select('id, barcode, serial_number, status, current_condition')
          .eq('id', existingAssembly.holder_id)
          .maybeSingle();
        if (h) activeHolder = h;
      } else {
        // Fallback por serial si existiera relación 1:1 histórica
        const { data: hBySerial } = await supabase
          .from('holder_dosimeters')
          .select('id, barcode, serial_number, status, current_condition')
          .eq('serial_number', dosimeter.serial_number)
          .maybeSingle();

        if (hBySerial) {
          activeHolder = hBySerial;
        }
      }
    }

    // 4.3 Si definitivamente NO tiene portadosímetro ensamblado: RECHAZAR
    if (!activeHolder) {
      throw new BadRequestException(
        `El dosímetro '${dosimeter.serial_number}' no tiene un portadosímetro ensamblado. Por seguridad física y normativa ISO 17025, debe ensamblar un portadosímetro antes de asignarlo al personal POE.`,
      );
    }

    // 4.4 Validar estado y condición del portadosímetro
    if (['en_campo', 'baja', 'en_triaje', 'danado'].includes(activeHolder.status)) {
      throw new BadRequestException(
        `El portadosímetro ensamblado '${activeHolder.barcode}' no se encuentra apto para despacho (estado actual: ${activeHolder.status}).`,
      );
    }

    if (['danado_grave', 'contaminado', 'perdido'].includes(activeHolder.current_condition)) {
      throw new BadRequestException(
        `El portadosímetro ensamblado '${activeHolder.barcode}' presenta condición crítica (${activeHolder.current_condition}) y no puede ser enviado a campo.`,
      );
    }

    // 5. Transición de estados y creación de asignación
    const { data: assignedStatus, error: statusError } = await supabase
      .from('dosimeter_statuses')
      .select('id')
      .eq('code', 'ASIGNADO')
      .single();

    if (statusError || !assignedStatus) {
      throw new Error('No se pudo resolver el estado ASIGNADO');
    }

    // 5.1 Actualizar estado del dosímetro a ASIGNADO
    const { error: statusUpdateError } = await supabase
      .from('dosimeters')
      .update({ status_id: assignedStatus.id })
      .eq('id', dosimeterId);

    if (statusUpdateError) {
      throw new Error('No se pudo actualizar el estado del dosímetro');
    }

    // 5.2 Actualizar estado del portadosímetro a 'en_campo'
    const { error: holderUpdateError } = await supabase
      .from('holder_dosimeters')
      .update({ status: 'en_campo' })
      .eq('id', activeHolder.id);

    if (holderUpdateError) {
      this.logger.error('Error al actualizar estado del portadosímetro a en_campo:', holderUpdateError);
      const { data: previousStatus } = await supabase
        .from('dosimeter_statuses')
        .select('id')
        .eq('code', 'DISPONIBLE')
        .maybeSingle();
      if (previousStatus) {
        await supabase.from('dosimeters').update({ status_id: previousStatus.id }).eq('id', dosimeterId);
      }
      throw new Error('No se pudo actualizar el estado del portadosímetro a en_campo');
    }

    // 5.3 Registrar asignación con holder_id
    const { data: newAssignment, error: assignError } = await supabase
      .from('dosimeter_assignments')
      .insert({
        dosimeter_id: dosimeterId,
        holder_id: activeHolder.id,
        worker_id: dto.worker_id,
        assigned_at: dto.assigned_at,
        notes: dto.notes ?? null,
        status: 'activo',
        assigned_by: requestingUserId,
      })
      .select('id, dosimeter_id, holder_id, worker_id, assigned_at, status, notes')
      .single();

    if (assignError || !newAssignment) {
      this.logger.error('Error al crear la asignación, revirtiendo estado del dosímetro y holder', assignError);
      const { data: previousStatus } = await supabase
        .from('dosimeter_statuses')
        .select('id')
        .eq('code', 'DISPONIBLE')
        .single();
      if (previousStatus) {
        await supabase.from('dosimeters').update({ status_id: previousStatus.id }).eq('id', dosimeterId);
      }
      if (expressCreatedAssemblyId) {
        await supabase.from('holder_tld_assemblies').delete().eq('id', expressCreatedAssemblyId);
        await supabase.from('holder_dosimeters').update({ status: 'disponible' }).eq('id', activeHolder.id);
      } else {
        await supabase.from('holder_dosimeters').update({ status: 'ensamblado' }).eq('id', activeHolder.id);
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
        dosimeter_serial: dosimeter.serial_number,
        holder_id: activeHolder.id,
        holder_barcode: activeHolder.barcode,
        worker_id: dto.worker_id,
        assigned_at: dto.assigned_at,
        resulting_status: 'ASIGNADO',
      },
    });

    return {
      ...newAssignment,
      holder: {
        id: activeHolder.id,
        barcode: activeHolder.barcode,
        serial_number: activeHolder.serial_number,
      },
    };
  }
}
