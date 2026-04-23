import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { UpdateClientDto } from '../dto/update-client.dto';

@Injectable()
export class UpdateClientUseCase {
  constructor(private readonly supabase: SupabaseService) {}

  async execute(
    clientId: string,
    dto: UpdateClientDto,
    organizationId: string,
    requestingUserId: string,
  ) {
    const supabase = this.supabase.getClient();

    const { data: existing } = await supabase
      .from('clients')
      .select('id, name, status')
      .eq('id', clientId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!existing) throw new NotFoundException('Cliente no encontrado');

    const { data, error } = await supabase
      .from('clients')
      .update({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.contact_name !== undefined && { contact_name: dto.contact_name }),
        ...(dto.contact_email !== undefined && { contact_email: dto.contact_email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.client_type !== undefined && { client_type: dto.client_type }),
        ...(dto.contract_start_date !== undefined && {
          contract_start_date: dto.contract_start_date,
        }),
        ...(dto.contract_end_date !== undefined && { contract_end_date: dto.contract_end_date }),
      })
      .eq('id', clientId)
      .select(
        `
        id, code, name, contact_name, contact_email,
        phone, address, website, client_type,
        contract_start_date, contract_end_date,
        status, created_at
      `,
      )
      .single();

    if (error) throw new Error(error.message);

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: requestingUserId,
      entity_name: 'clients',
      entity_id: clientId,
      action: 'UPDATE',
      old_values: { name: existing.name },
      new_values: dto,
    });

    return data;
  }
}
