import { Injectable } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';

@Injectable()
export class FindAllClientsUseCase {
  constructor(private readonly supabase: SupabaseService) {}

  async execute(
    organizationId: string,
    search?: string,
    status?: string,
    clientType?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    let query = this.supabase
      .getClient()
      .from('clients')
      .select(
        `
      id, code, name, contact_name, contact_email,
      phone, address, website, client_type,
      contract_start_date, contract_end_date,
      status, created_at,
      client_locations(id, name, status)
      `,
        { count: 'exact' }, // ← necesario para obtener el total
      )
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });

    if (status) query = query.eq('status', status);
    if (clientType) query = query.eq('client_type', clientType);
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,code.ilike.%${search}%,contact_name.ilike.%${search}%`,
      );
    }

    // Paginación — Supabase usa índices base 0
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw new Error('No se pudo obtener el listado de clientes');

    return {
      items: data ?? [],
      total: count ?? 0,
    };
  }
}
