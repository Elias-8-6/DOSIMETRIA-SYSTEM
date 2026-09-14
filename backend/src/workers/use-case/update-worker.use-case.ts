import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AuditService } from '@common/services/audit.service';
import { UpdateWorkerDto } from '../dto/update-worker.dto';

@Injectable()
export class UpdateWorkerUseCase {
  constructor(
    private supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  async execute(
    workerId: string,
    dto: UpdateWorkerDto,
    organizationId: string,
    requestingUserId: string,
  ) {
    const supabase = this.supabase.getClient();

    // Verificar que el worker pertenece a la organización
    const { data: existing } = await supabase
      .from('workers')
      .select('id, full_name, clients!inner(organization_id)')
      .eq('id', workerId)
      .eq('clients.organization_id', organizationId)
      .maybeSingle();

    if (!existing) throw new NotFoundException('Trabajador no encontrado');

    const { data, error } = await supabase
      .from('workers')
      .update({
        ...(dto.client_location_id !== undefined && { client_location_id: dto.client_location_id }),
        ...(dto.employee_code !== undefined && { employee_code: dto.employee_code }),
        ...(dto.full_name !== undefined && { full_name: dto.full_name }),
        ...(dto.document_number !== undefined && { document_number: dto.document_number }),
        ...(dto.date_of_birth !== undefined && { date_of_birth: dto.date_of_birth }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.occupation !== undefined && { occupation: dto.occupation }),
        ...(dto.start_date !== undefined && { start_date: dto.start_date }),
      })
      .eq('id', workerId)
      .select('id, full_name, document_number, status')
      .single();

    if (error) throw new Error(error.message);

    await this.audit.log({
      userId: requestingUserId,
      entityName: 'workers',
      entityId: workerId,
      action: 'UPDATE',
      oldValues: { full_name: existing.full_name },
      newValues: dto as unknown as Record<string, unknown>,
    });

    return data;
  }
}
