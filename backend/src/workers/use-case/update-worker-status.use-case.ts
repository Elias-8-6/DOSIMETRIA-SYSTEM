import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { UpdateWorkerStatusDto } from '../dto/update-worker-status.dto';

@Injectable()
export class UpdateWorkerStatusUseCase {
  constructor(private supabase: SupabaseService) {}

  async execute(
    workerId: string,
    dto: UpdateWorkerStatusDto,
    organizationId: string,
    requestingUserId: string,
  ) {
    const supabase = this.supabase.getClient();

    const { data: existing } = await supabase
      .from('workers')
      .select('id, status, clients!inner(organization_id)')
      .eq('id', workerId)
      .eq('clients.organization_id', organizationId)
      .maybeSingle();

    if (!existing) throw new NotFoundException('Trabajador no encontrado');

    const { data, error } = await supabase
      .from('workers')
      .update({ status: dto.status })
      .eq('id', workerId)
      .select('id, full_name, status')
      .single();

    if (error) throw new Error(error.message);

    await supabase.from('audit_logs').insert({
      user_id: requestingUserId,
      entity_name: 'workers',
      entity_id: workerId,
      action: 'STATUS_CHANGE',
      old_values: { status: existing.status },
      new_values: { status: dto.status },
    });

    return data;
  }
}
