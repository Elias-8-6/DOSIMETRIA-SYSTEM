import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { OrganizationScopeService } from '@common/services/organization-scope.service';
import { HolderInfo } from './find-one-dosimeter.use-case';

export interface FoundDosimeterByBarcode {
  id: string;
  serial_number: string;
  barcode: string;
  internal_code: string | null;
  lot_number: string | null;
  manufacture_date: string | null;
  commissioning_date: string | null;
  wear_period_days: number | null;
  max_dose_limit: number | null;
  last_annealing_date: string | null;
  current_condition: string;
  reusable: boolean;
  notes: string | null;
  model: string | null;
  manufacturer: string | null;
  photo_url: string | null;
  created_at: string;
  dosimeter_types?: unknown;
  dosimeter_statuses?: unknown;
  dosimeter_assignments: unknown[];
  active_holder: HolderInfo | null;
}

@Injectable()
export class FindDosimeterByBarcodeUseCase {
  private readonly logger = new Logger(FindDosimeterByBarcodeUseCase.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly orgScope: OrganizationScopeService,
  ) {}

  async execute(barcode: string, organizationId: string): Promise<FoundDosimeterByBarcode> {
    const safeBarcode = (barcode || '').trim();
    if (!safeBarcode) {
      throw new NotFoundException('Código de barras no proporcionado');
    }

    const supabase = this.supabase.getClient();

    const { data, error } = await supabase
      .from('dosimeters')
      .select(`
        id, serial_number, barcode, internal_code, lot_number,
        manufacture_date, commissioning_date, wear_period_days,
        max_dose_limit, last_annealing_date, current_condition,
        reusable, notes, model, manufacturer, photo_url, created_at,
        dosimeter_types(id, code, name, technology),
        dosimeter_statuses(id, code, name)
      `)
      .eq('barcode', safeBarcode)
      .maybeSingle();

    if (error) {
      this.logger.error(`Error al buscar dosímetro por barcode '${safeBarcode}':`, error);
      throw new Error('Error al obtener el dosímetro por código de barras');
    }

    if (!data) {
      throw new NotFoundException(`Dosímetro con código de barras '${safeBarcode}' no encontrado`);
    }

    const orgType = await this.orgScope.getOrganizationType(organizationId);
    if (orgType === 'client') {
      const allowed = await this.orgScope.isDosimeterAllowedForClientOrg(
        data.id,
        organizationId,
      );
      if (!allowed) {
        throw new NotFoundException(`Dosímetro con código de barras '${safeBarcode}' no encontrado`);
      }
    }

    // Resolver asignación abierta
    let assignmentQuery = supabase
      .from('dosimeter_assignments')
      .select(
        orgType === 'client'
          ? `
        id, assigned_at, returned_at, status, notes,
        workers!inner(id, full_name, document_number, clients!inner(id, name, code), client_locations(id, name))
      `
          : `
        id, assigned_at, returned_at, status, notes,
        workers(id, full_name, document_number, clients(id, name, code), client_locations(id, name))
      `,
      )
      .eq('dosimeter_id', data.id)
      .is('returned_at', null);

    if (orgType === 'client') {
      assignmentQuery = assignmentQuery.eq('workers.clients.organization_id', organizationId);
    }

    const { data: openAssignment, error: assignmentError } = await assignmentQuery;
    if (assignmentError) {
      this.logger.error(`Error al consultar asignaciones para dosímetro '${data.id}':`, assignmentError);
      throw new Error('Error al obtener la asignación del dosímetro');
    }

    // Resolver portadosímetro ensamblado actualmente
    let activeHolder: HolderInfo | null = null;
    const { data: assemblyData } = await supabase
      .from('holder_tld_assemblies')
      .select('id, assembled_at, holder_dosimeters(id, barcode, serial_number, holder_color, clip_type, model, status, current_condition)')
      .eq('dosimeter_id', data.id)
      .eq('is_active', true)
      .maybeSingle();

    if (assemblyData?.holder_dosimeters) {
      const h = assemblyData.holder_dosimeters as unknown as HolderInfo;
      activeHolder = {
        id: h.id,
        barcode: h.barcode,
        serial_number: h.serial_number,
        holder_color: h.holder_color,
        clip_type: h.clip_type,
        model: h.model,
        status: h.status,
        current_condition: h.current_condition,
        assembly_id: assemblyData.id,
        assembled_at: assemblyData.assembled_at,
      };
    } else {
      // Fallback por serial coincidente
      const { data: hBySerial } = await supabase
        .from('holder_dosimeters')
        .select('id, barcode, serial_number, holder_color, clip_type, model, status, current_condition')
        .eq('serial_number', data.serial_number)
        .maybeSingle();

      if (hBySerial) {
        activeHolder = {
          ...hBySerial,
          assembly_id: null,
          assembled_at: null,
        };
      }
    }

    return {
      ...data,
      barcode: data.barcode ?? safeBarcode,
      dosimeter_assignments: openAssignment ?? [],
      active_holder: activeHolder,
    };
  }
}
