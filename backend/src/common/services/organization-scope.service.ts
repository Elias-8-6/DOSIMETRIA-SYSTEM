import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';

export type OrganizationType = 'laboratory' | 'client';

/**
 * Resuelve el criterio de visibilidad laboratorio-vs-cliente para entidades
 * sin organization_id propio (ej. dosimeters). Reproduce en NestJS la misma
 * lógica que la policy RLS "org_isolation" de dosimeters/dosimeter_readings
 * (migración 016) — necesario porque SupabaseService opera con la
 * service_role key, que bypassa RLS por completo.
 *
 * Pensado como servicio genérico y reutilizable: service_orders y
 * receptions van a necesitar el mismo criterio (dueño indirecto vía
 * workers/clients, no un organization_id directo).
 */
@Injectable()
export class OrganizationScopeService {
  constructor(private readonly supabase: SupabaseService) {}

  async getOrganizationType(organizationId: string): Promise<OrganizationType> {
    const { data, error } = await this.supabase
      .getClient()
      .from('organizations')
      .select('type')
      .eq('id', organizationId)
      .maybeSingle();

    if (error) throw new Error('No se pudo determinar el tipo de organización');
    if (!data) throw new NotFoundException('Organización no encontrada');

    return data.type as OrganizationType;
  }

  /**
   * IDs de dosímetros alguna vez asignados a un trabajador de esta
   * organización cliente, vía dosimeter_assignments → workers → clients.
   */
  async getAllowedDosimeterIds(organizationId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('dosimeter_assignments')
      .select('dosimeter_id, workers!inner(clients!inner(organization_id))')
      .eq('workers.clients.organization_id', organizationId);

    if (error) throw new Error('No se pudo resolver el inventario visible para esta organización');

    const ids = new Set((data ?? []).map((row) => row.dosimeter_id as string));
    return Array.from(ids);
  }

  async isDosimeterAllowedForClientOrg(
    dosimeterId: string,
    organizationId: string,
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .getClient()
      .from('dosimeter_assignments')
      .select('id, workers!inner(clients!inner(organization_id))')
      .eq('dosimeter_id', dosimeterId)
      .eq('workers.clients.organization_id', organizationId)
      .limit(1)
      .maybeSingle();

    if (error) throw new Error('No se pudo verificar el acceso a este dosímetro');
    return !!data;
  }

  /**
   * IDs de la(s) fila(s) de `clients` que pertenecen a esta organización
   * (clients.organization_id = organizationId). Para una organización tipo
   * 'client' normalmente es un único id -- es la institución que representa.
   * Usado por service_orders/receptions para resolver "mis propias órdenes"
   * sin pasar por la indirección de workers que necesita dosimeters.
   */
  async getOwnClientIds(organizationId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('clients')
      .select('id')
      .eq('organization_id', organizationId);

    if (error) throw new Error('No se pudo resolver el cliente asociado a esta organización');
    return (data ?? []).map((row) => row.id as string);
  }

  /**
   * Un dosímetro "pertenece" a un cliente si alguna vez fue asignado a un
   * worker de ese cliente (workers.client_id es FK directa, migración 003 --
   * no requiere el join a clients.organization_id que usa
   * isDosimeterAllowedForClientOrg).
   */
  async isDosimeterOwnedByClient(dosimeterId: string, clientId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .getClient()
      .from('dosimeter_assignments')
      .select('id, workers!inner(client_id)')
      .eq('dosimeter_id', dosimeterId)
      .eq('workers.client_id', clientId)
      .limit(1)
      .maybeSingle();

    if (error) throw new Error('No se pudo verificar la pertenencia del dosímetro');
    return !!data;
  }
}
