import { Injectable, ConflictException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { CreateClientDto } from '@clients/dto/create-client.dto';
import { exists } from 'node:fs';

Injectable();
export class CreateClientUseCase {
  constructor(private readonly supabase: SupabaseService) {}

  async execute(dto: CreateClientDto, organizationId: string) {
    if (dto.code) {
      const { data: existing } = await this.supabase
        .getClient()
        .from('clients')
        .select('id')
        .eq('code', dto.code)
        .maybeSingle();

      if (existing) {
        throw new ConflictException('ya existe un cliente con este código');
      }

      const { data, error } = await this.supabase
        .getClient()
        .from('clients')
        .insert({
          organization_id: organizationId,
          name: dto.name,
          code: dto.code ?? null,
          contact_name: dto.contact_name ?? null,
          contact_email: dto.contact_email ?? null,
          status: 'active',
        })
        .select('id, code, name, contact_name, contact_email, status, create_at')
        .single();

      if (error) throw new Error(error.message);
      return data;
    }
  }
}
