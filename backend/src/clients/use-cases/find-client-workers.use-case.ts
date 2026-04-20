import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';

@Injectable()
export class FindClientWorkersUseCase {
  constructor(private readonly supabase: SupabaseService) {}

  async execute(clientId: string) {
    // Verificar que el cliente existe
    const { data: client } = await this.supabase
      .getClient()
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .maybeSingle();

    if (!client) throw new NotFoundException(`Cliente ${clientId} no encontrado`);

    const { data, error } = await this.supabase
      .getClient()
      .from('workers')
      .select(
        `
        id,
        employee_code,
        full_name,
        document_number,
        status,
        client_location_id,
        client_locations ( id, name )
      `,
      )
      .eq('client_id', clientId)
      .order('full_name', { ascending: true });

    if (error) throw new Error(error.message);

    return data;
  }
}
