import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';

@Injectable()
export class FindClientLocationsUseCase {
  constructor(private readonly supabase: SupabaseService) {}

  async execute(clientId: string) {
    const { data: client } = await this.supabase
      .getClient()
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .maybeSingle();

    if (!client) throw new NotFoundException('cliente no encontrado');

    const { data, error } = await this.supabase
      .getClient()
      .from('client_locations')
      .select('id, name, address, status')
      .eq('client_id', clientId)
      .order('name', { ascending: true });

    if (error) throw new NotFoundException(error.message);

    return data;
  }
}
