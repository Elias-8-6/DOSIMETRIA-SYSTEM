import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AuditService } from '@common/services/audit.service';
import { UpdateClientDto } from '../dto/update-client.dto';

@Injectable()
export class UpdateClientUseCase {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

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

    await this.audit.log({
      userId: requestingUserId,
      entityName: 'clients',
      entityId: clientId,
      action: 'UPDATE',
      oldValues: { name: existing.name },
      newValues: dto as unknown as Record<string, unknown>,
    });

    return data;
  }
}
