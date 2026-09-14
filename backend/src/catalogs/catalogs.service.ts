import { Injectable } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';

@Injectable()
export class CatalogsService {
  constructor(private readonly supabase: SupabaseService) {}

  async getDosimeterTypes() {
    const { data, error } = await this.supabase
      .getClient()
      .from('dosimeter_types')
      .select('id, code, name, technology')
      .order('name', { ascending: true });

    if (error) throw new Error('No se pudo obtener el catálogo de tipos de dosímetro');
    return data ?? [];
  }

  async getDosimeterStatuses() {
    const { data, error } = await this.supabase
      .getClient()
      .from('dosimeter_statuses')
      .select('id, code, name')
      .order('name', { ascending: true });

    if (error) throw new Error('No se pudo obtener el catálogo de estados de dosímetro');
    return data ?? [];
  }
}
