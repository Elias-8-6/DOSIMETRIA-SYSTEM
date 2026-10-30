import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AuditService } from '@common/services/audit.service';
import { CreateWorkerDto } from '../dto/create-worker.dto';

@Injectable()
export class CreateWorkerUseCase {
  private readonly logger = new Logger(CreateWorkerUseCase.name);
  constructor(
    private supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  async execute(dto: CreateWorkerDto, organizationId: string, requestingUserId: string) {
    const client = this.supabase.getClient();

    // Verificar que el client_id pertenece a la organización
    const { data: clientData } = await client
      .from('clients')
      .select('id')
      .eq('id', dto.client_id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!clientData) {
      throw new NotFoundException('Cliente no encontrado en esta organización');
    }

    // Verificar document_number único por cliente
    if (dto.document_number) {
      const { data: existing } = await client
        .from('workers')
        .select('id')
        .eq('client_id', dto.client_id)
        .eq('document_number', dto.document_number)
        .maybeSingle();

      if (existing) {
        throw new ConflictException(
          `Ya existe un trabajador con el documento '${dto.document_number}' en este cliente`,
        );
      }
    }

    const { data: newWorker, error } = await client
      .from('workers')
      .insert({
        client_id: dto.client_id,
        client_location_id: dto.client_location_id ?? null,
        employee_code: dto.employee_code ?? null,
        full_name: dto.full_name,
        document_number: dto.document_number ?? null,
        date_of_birth: dto.date_of_birth ?? null,
        gender: dto.gender ?? null,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        occupation: dto.occupation ?? null,
        start_date: dto.start_date ?? null,
        minsa_exam_date: dto.minsa_exam_date ?? null,
        minsa_certificate_code: dto.minsa_certificate_code ?? null,
        medical_status: dto.medical_status ?? 'apto',
        status: 'active',
      })
      .select('id, full_name, document_number, minsa_exam_date, minsa_exam_expiry_date, medical_status, status')
      .single();

    if (error || !newWorker) {
      this.logger.error('Error al crear trabajador (POE):', error);
      throw new Error('No se pudo crear el trabajador');
    }

    await this.audit.log({
      userId: requestingUserId,
      entityName: 'workers',
      entityId: newWorker.id,
      action: 'CREATE',
      newValues: {
        full_name: newWorker.full_name,
        document_number: newWorker.document_number,
        medical_status: newWorker.medical_status,
        status: newWorker.status,
      },
    });

    return newWorker;
  }
}
