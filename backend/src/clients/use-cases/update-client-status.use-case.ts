import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { UpdateClientStatusDto } from '@clients/dto/update-client-status.dto';

@Injectable()
export class UpdateClientStatusUseCase {
  constructor(private readonly supabase: SupabaseService) {}

  async execute(id: string, dto: UpdateClientStatusDto) {
    const { data: existing } = await this.supabase
      .getClient()
      .from('clients')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      throw new NotFoundException('El cliente no existe');
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('clients')
      .update({
        ...(dto.status !== undefined && { name: dto.status }),
      })
      .eq('id', id)
      .select('id, status')
      .single();

    if (error) throw new Error(error.message);

    return data;
  }
}
