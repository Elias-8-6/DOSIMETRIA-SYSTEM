import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { UpdateClientStatusDto } from '../dto/update-client-status.dto';

@Injectable()
export class UpdateClientStatusUseCase {
  constructor(private readonly supabase: SupabaseService) {}

  async execute(
    clientId: string,
    dto: UpdateClientStatusDto,
    organizationId: string,
    requestingUserId: string,
  ) {
    const supabase = this.supabase.getClient();

    const { data: existing } = await supabase
      .from('clients')
      .select('id, status')
      .eq('id', clientId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!existing) throw new NotFoundException('Cliente no encontrado');

    const { data, error } = await supabase
      .from('clients')
      .update({ status: dto.status })
      .eq('id', clientId)
      .select('id, name, status')
      .single();

    if (error) throw new Error(error.message);

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: requestingUserId,
      entity_name: 'clients',
      entity_id: clientId,
      action: 'STATUS_CHANGE',
      old_values: { status: existing.status },
      new_values: { status: dto.status },
    });

    return data;
  }
}
