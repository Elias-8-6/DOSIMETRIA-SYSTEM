import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';

@Injectable()
export class FindOneClientUseCase {
  constructor(private readonly supabase: SupabaseService) {}

  async execute(clientId: string, organizationId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('clients')
      .select(
        `
        id, code, name, contact_name, contact_email,
        phone, address, website, client_type,
        contract_start_date, contract_end_date,
        status, created_at,
        client_locations(
          id, name, address, phone, contact_name,
          radiation_type, risk_level, status
        )
      `,
      )
      .eq('id', clientId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) throw new Error('Error al obtener el cliente');
    if (!data) throw new NotFoundException('Cliente no encontrado');

    return data;
  }
}
