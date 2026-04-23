import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { CreateClientDto } from '../dto/create-client.dto';

@Injectable()
export class CreateClientUseCase {
  private readonly logger = new Logger(CreateClientUseCase.name);

  constructor(private readonly supabase: SupabaseService) {}

  async execute(dto: CreateClientDto, organizationId: string, requestingUserId: string) {
    const client = this.supabase.getClient();

    // Verificar nombre único dentro de la organización
    const { data: existing } = await client
      .from('clients')
      .select('id')
      .eq('organization_id', organizationId)
      .ilike('name', dto.name)
      .maybeSingle();

    if (existing) {
      throw new ConflictException(`Ya existe un cliente con el nombre '${dto.name}'`);
    }

    // Generar código único si no viene en el DTO
    let code = dto.code;
    if (!code) {
      const prefix = dto.name.substring(0, 4).toUpperCase().replace(/\s/g, '');
      // Buscar cuántos códigos con ese prefijo ya existen para evitar duplicados
      const { data: existingCodes } = await client
        .from('clients')
        .select('code')
        .like('code', `${prefix}-%`);
      const next = (existingCodes?.length ?? 0) + 1;
      code = `${prefix}-${String(next).padStart(3, '0')}`;
    } else {
      // Verificar que el código manual no esté en uso
      const { data: codeConflict } = await client
        .from('clients')
        .select('id')
        .eq('code', code)
        .maybeSingle();
      if (codeConflict) {
        throw new ConflictException(`El código '${code}' ya está en uso`);
      }
    }

    const { data: newClient, error } = await client
      .from('clients')
      .insert({
        organization_id: organizationId,
        code,
        name: dto.name,
        contact_name: dto.contact_name ?? null,
        contact_email: dto.contact_email ?? null,
        phone: dto.phone ?? null,
        address: dto.address ?? null,
        website: dto.website ?? null,
        client_type: dto.client_type ?? null,
        contract_start_date: dto.contract_start_date ?? null,
        contract_end_date: dto.contract_end_date ?? null,
        status: 'active',
      })
      .select(
        `
        id, code, name, contact_name, contact_email,
        phone, address, website, client_type,
        contract_start_date, contract_end_date,
        status, created_at
      `,
      )
      .single();

    if (error || !newClient) {
      this.logger.error('Error al crear cliente:', error);
      // Capturar duplicado de código a nivel de DB como último recurso
      if (error?.code === '23505') {
        throw new ConflictException('El código generado ya existe. Intenta de nuevo.');
      }
      throw new Error('No se pudo crear el cliente');
    }

    // Audit log
    await client.from('audit_logs').insert({
      user_id: requestingUserId,
      entity_name: 'clients',
      entity_id: newClient.id,
      action: 'CREATE',
      old_values: null,
      new_values: { name: newClient.name, code: newClient.code, status: newClient.status },
    });

    return newClient;
  }
}
