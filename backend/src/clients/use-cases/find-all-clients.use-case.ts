import { Injectable } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { QueryClientsDto } from '@clients/dto/query-clients.dto';

@Injectable()
export class FindAllClientsUseCases {
  constructor(private readonly supabase: SupabaseService) {}

  async execute(query: QueryClientsDto) {
    let q = this.supabase
      .getClient()
      .from('clients')
      .select('id, code, name, contact_name, contact_email, status, createdAt, updated_at')
      .order('name', { ascending: true });

    if (query.search) {
      q = q.or('name.ilike.%${query.search}%,code.ilike.%${query.search}%');
    }

    if (query.search) {
      q = q.eq('status', query.search);
    }

    const { data, error } = await q;

    if (error) throw new Error(error.message);

    return data;
  }
}
