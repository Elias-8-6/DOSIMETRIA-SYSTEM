import { Injectable } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';

@Injectable()
export class FindAllWorkersUseCase {
  constructor(private supabase: SupabaseService) {}

  async execute(
    organizationId: string,
    search?: string,
    status?: string,
    clientId?: string,
    clientLocationId?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    let query = this.supabase
      .getClient()
      .from('workers')
      .select(
        `
      id, employee_code, full_name, document_number,
      date_of_birth, gender, phone, email,
      occupation, start_date, status,
      clients!inner(id, name, code, organization_id),
      client_locations(id, name)
      `,
        { count: 'exact' },
      )
      .eq('clients.organization_id', organizationId)
      .order('full_name', { ascending: true });

    if (status) query = query.eq('status', status);
    if (clientId) query = query.eq('client_id', clientId);
    if (clientLocationId) query = query.eq('client_location_id', clientLocationId);
    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,document_number.ilike.%${search}%,employee_code.ilike.%${search}%`,
      );
    }

    const from = (page - 1) * limit;
    query = query.range(from, from + limit - 1);

    const { data, error, count } = await query;
    if (error) throw new Error('No se pudo obtener el listado de trabajadores');

    return { items: data ?? [], total: count ?? 0 };
  }
}
