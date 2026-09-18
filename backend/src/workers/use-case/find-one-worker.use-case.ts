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
      .order('assigned_at', { referencedTable: 'dosimeter_assignments', ascending: false })
      .order('returned_at', { referencedTable: 'dosimeter_assignments', ascending: false, nullsFirst: true })
      .maybeSingle();

    if (error) throw new Error('Error al obtener el trabajador');
    if (!data) throw new NotFoundException('Trabajador no encontrado');

    const sortedAssignments = (data.dosimeter_assignments ?? []).sort((a: any, b: any) => {
      const aIsActive = a.status === 'activo' || !a.returned_at;
      const bIsActive = b.status === 'activo' || !b.returned_at;
      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;

      const dateA = new Date(a.assigned_at).getTime();
      const dateB = new Date(b.assigned_at).getTime();
      if (dateB !== dateA) return dateB - dateA;

      if (!a.returned_at && b.returned_at) return -1;
      if (a.returned_at && !b.returned_at) return 1;
      if (a.returned_at && b.returned_at) {
        return new Date(b.returned_at).getTime() - new Date(a.returned_at).getTime();
      }

      return 0;
    });

    return { ...data, dosimeter_assignments: sortedAssignments };
  }
}
