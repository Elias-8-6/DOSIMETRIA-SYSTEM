import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { CreateWorkerDto } from '../dto/create-worker.dto';

@Injectable()
export class CreateWorkerUseCase {
  constructor(private readonly supabase: SupabaseService) {}

  async execute(clientId: string, dto: CreateWorkerDto) {
    // Verificar que el cliente existe
    const { data: client } = await this.supabase
      .getClient()
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .maybeSingle();

    if (!client) throw new NotFoundException(`Cliente ${clientId} no encontrado`);

    // Verificar unicidad de document_number dentro del cliente
    if (dto.document_number) {
      const { data: existing } = await this.supabase
        .getClient()
        .from('workers')
        .select('id')
        .eq('client_id', clientId)
        .eq('document_number', dto.document_number)
        .maybeSingle();

      if (existing) {
        throw new ConflictException(
          `Ya existe un trabajador con documento ${dto.document_number} en este cliente`,
        );
      }
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('workers')
      .insert({
        client_id: clientId,
        full_name: dto.full_name,
        document_number: dto.document_number ?? null,
        employee_code: dto.employee_code ?? null,
        client_location_id: dto.client_location_id ?? null,
        status: 'active',
      })
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
      .single();

    if (error) throw new Error(error.message);

    return data;
  }
}
