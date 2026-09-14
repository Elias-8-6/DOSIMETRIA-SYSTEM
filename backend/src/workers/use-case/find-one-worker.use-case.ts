import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';

@Injectable()
export class FindOneWorkerUseCase {
  constructor(private supabase: SupabaseService) {}

  async execute(workerId: string, organizationId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('workers')
      .select(
        `
      id, employee_code, full_name, document_number,
      date_of_birth, gender, phone, email,
      occupation, start_date, status,
      clients!inner(id, name, code, organization_id),
      client_locations(id, name, address),
      dosimeter_assignments(
        id, assigned_at, returned_at, status, notes,
        dosimeters(id, serial_number, internal_code,
          dosimeter_types(name, technology),
          dosimeter_statuses(code, name)
        )
      )
      `,
      )
      .eq('id', workerId)
      .eq('clients.organization_id', organizationId)
      .maybeSingle();
    if (error) throw new Error('Error al obtener el trabajador');
    if (!data) throw new NotFoundException('Trabajador no encontrado');

    return data;
  }
}
