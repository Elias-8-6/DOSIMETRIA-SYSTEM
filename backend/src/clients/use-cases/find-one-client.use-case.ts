import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';

@Injectable()
export class FindOneClientUseCase {
  constructor(private readonly supabase: SupabaseService) {}

  async execute(id: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('clients')
      .select('id, code, name, contact_name, contact_email, status, create_at')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundException('Cliente no encontrado');

    return data;
  }
}
