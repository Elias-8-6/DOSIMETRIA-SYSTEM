import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { CreateClientLocationDto } from '../dto/create-client-location.dto';

@Injectable()
export class ManageClientLocationsUseCase {
  constructor(private readonly supabase: SupabaseService) {}

  async create(clientId: string, dto: CreateClientLocationDto, organizationId: string) {
    const supabase = this.supabase.getClient();

    // Verificar que el cliente pertenece a la organización
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!client) throw new NotFoundException('Cliente no encontrado');

    const { data, error } = await supabase
      .from('client_locations')
      .insert({
        client_id:      clientId,
        name:           dto.name,
        address:        dto.address        ?? null,
        phone:          dto.phone          ?? null,
        contact_name:   dto.contact_name   ?? null,
        radiation_type: dto.radiation_type ?? null,
        risk_level:     dto.risk_level     ?? null,
        status:         'active',
      })
      .select('id, name, address, phone, contact_name, radiation_type, risk_level, status')
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async update(
    clientId: string,
    locationId: string,
    dto: Partial<CreateClientLocationDto>,
    organizationId: string,
  ) {
    const supabase = this.supabase.getClient();

    // Verificar que la ubicación pertenece al cliente de la organización
    const { data: existing } = await supabase
      .from('client_locations')
      .select('id, client_id')
      .eq('id', locationId)
      .eq('client_id', clientId)
      .maybeSingle();

    if (!existing) throw new NotFoundException('Sede no encontrada');

    const { data, error } = await supabase
      .from('client_locations')
      .update({
        ...(dto.name           !== undefined && { name:           dto.name }),
        ...(dto.address        !== undefined && { address:        dto.address }),
        ...(dto.phone          !== undefined && { phone:          dto.phone }),
        ...(dto.contact_name   !== undefined && { contact_name:   dto.contact_name }),
        ...(dto.radiation_type !== undefined && { radiation_type: dto.radiation_type }),
        ...(dto.risk_level     !== undefined && { risk_level:     dto.risk_level }),
      })
      .eq('id', locationId)
      .select('id, name, address, phone, contact_name, radiation_type, risk_level, status')
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async updateStatus(
    clientId: string,
    locationId: string,
    status: 'active' | 'inactive',
    organizationId: string,
  ) {
    const supabase = this.supabase.getClient();

    const { data: existing } = await supabase
      .from('client_locations')
      .select('id')
      .eq('id', locationId)
      .eq('client_id', clientId)
      .maybeSingle();

    if (!existing) throw new NotFoundException('Sede no encontrada');

    const { data, error } = await supabase
      .from('client_locations')
      .update({ status })
      .eq('id', locationId)
      .select('id, name, status')
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
}
