import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { CreateLocationDto } from '@clients/dto/create-location.dto';

@Injectable()
export class CreateLocationUseCase {
  constructor(private readonly supabase: SupabaseService) {}

  async execute(clientId: string, dto: CreateLocationDto) {
    const { data: existingClient } = await this.supabase
      .getClient()
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .maybeSingle();

    if (!existingClient) {
      throw new NotFoundException('El cliente No existe');
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('client_locations')
      .insert({
        client_id: clientId,
        name: dto.name,
        address: dto.address,
        status: 'active',
      })
      .select('id, name, address, status')
      .single();

    if (error) throw new Error(error.message);

    return data;
  }
}
