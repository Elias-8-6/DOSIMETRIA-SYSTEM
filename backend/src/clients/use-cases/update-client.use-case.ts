import { Injectable, ConflictException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { UpdateClientDto } from '@clients/dto/update-client.dto';

Injectable();
export class UpdateClientUseCase {
  constructor(private readonly supabase: SupabaseService) {}

  async execute(dto: UpdateClientDto, id: string) {
    const { data: existing } = await this.supabase
      .getClient()
      .from('clients')
      .select('id')
      .neq('id', id)
      .maybeSingle();

    if (!existing) {
      throw new ConflictException('No existe este cliente');
    }

    if (dto.code) {
      const { data: codeConflict } = await this.supabase
        .getClient()
        .from('clients')
        .select('id')
        .eq('code', dto.code)
        .neq('id', id)
        .maybeSingle();

      if (codeConflict) {
        throw new ConflictException('Ya existe este cliente');
      }
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('clients')
      .update({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.contact_name !== undefined && {
          contact_name: dto.contact_name,
        }),
        ...(dto.contact_email !== undefined && {
          contact_email: dto.contact_email,
        }),
      })
      .eq('id', id)
      .select('id, code, name, contact_name, contact_email, status, created_at')
      .single();

    if (error) throw new Error(error.message);

    return data;
  }
}
