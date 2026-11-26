import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { OrganizationScopeService } from '@common/services/organization-scope.service';

export interface ValidatedDosimeterInfo {
  id: string;
  serial_number: string;
  barcode: string;
  internal_code?: string | null;
  lot_number?: string | null;
  model?: string | null;
  manufacturer?: string | null;
  current_condition: string;
  reusable: boolean;
  status_code?: string;
  status_name?: string;
  dosimeter_type_name?: string;
  active_holder?: {
    id: string;
    barcode: string;
    serial_number: string;
    holder_color?: string | null;
    clip_type?: string | null;
    model?: string | null;
    current_condition?: string;
    status: string;
  } | null;
  active_assignment?: {
    id: string;
    assigned_at: string;
    worker_name?: string;
    client_name?: string;
  } | null;
}

export interface ValidateDosimeterBarcodeResult {
  exists: boolean;
  dosimeter: ValidatedDosimeterInfo | null;
  message: string;
}

@Injectable()
export class ValidateDosimeterBarcodeUseCase {
  private readonly logger = new Logger(ValidateDosimeterBarcodeUseCase.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly orgScope: OrganizationScopeService,
  ) {}

  async execute(barcode: string, organizationId: string): Promise<ValidateDosimeterBarcodeResult> {
    const orgType = await this.orgScope.getOrganizationType(organizationId);
    if (orgType !== 'laboratory') {
      throw new ForbiddenException('Solo el personal de laboratorio puede validar códigos de barras');
    }

    const cleanBarcode = (barcode || '').trim();
    if (!cleanBarcode) {
      return {
        exists: false,
        dosimeter: null,
        message: 'Código de barras no proporcionado',
      };
    }

    const supabase = this.supabase.getClient();

    const { data: dosimeter, error } = await supabase
      .from('dosimeters')
      .select(`
        id, serial_number, barcode, internal_code, lot_number,
        model, manufacturer, current_condition, reusable,
        dosimeter_statuses(code, name),
        dosimeter_types(name)
      `)
      .eq('barcode', cleanBarcode)
      .maybeSingle();

    if (error) {
      this.logger.error(`Error consultando dosimeters por barcode '${cleanBarcode}':`, error);
      throw new Error(`Error en base de datos al validar código de barras: ${error.message}`);
    }

    if (!dosimeter) {
      return {
        exists: false,
        dosimeter: null,
        message: `El código de barras '${cleanBarcode}' está disponible para registro.`,
      };
    }

    // Resolver portadosímetro ensamblado si existe
    let activeHolder: ValidatedDosimeterInfo['active_holder'] = null;
    try {
      const { data: assembly } = await supabase
        .from('holder_tld_assemblies')
        .select(`
          id, assembled_at,
          holder_dosimeters(id, barcode, serial_number, holder_color, clip_type, model, status, current_condition)
        `)
        .eq('dosimeter_id', dosimeter.id)
        .eq('is_active', true)
        .maybeSingle();

      if (assembly?.holder_dosimeters) {
        const h = assembly.holder_dosimeters as any;
        activeHolder = {
          id: h.id,
          barcode: h.barcode,
          serial_number: h.serial_number,
          holder_color: h.holder_color,
          clip_type: h.clip_type,
          model: h.model,
          current_condition: h.current_condition,
          status: h.status,
        };
      }
    } catch (e) {
      this.logger.warn(`No se pudo cargar ensamble para dosímetro ${dosimeter.id}:`, e);
    }

    // Resolver asignación abierta si existe
    let activeAssignment: ValidatedDosimeterInfo['active_assignment'] = null;
    try {
      const { data: assignment } = await supabase
        .from('dosimeter_assignments')
        .select(`
          id, assigned_at,
          workers(full_name, clients(name))
        `)
        .eq('dosimeter_id', dosimeter.id)
        .is('returned_at', null)
        .order('assigned_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (assignment) {
        const w = (assignment as any).workers;
        activeAssignment = {
          id: assignment.id,
          assigned_at: assignment.assigned_at,
          worker_name: w?.full_name,
          client_name: w?.clients?.name,
        };
      }
    } catch (e) {
      this.logger.warn(`No se pudo cargar asignación para dosímetro ${dosimeter.id}:`, e);
    }

    const statuses = dosimeter.dosimeter_statuses as any;
    const types = dosimeter.dosimeter_types as any;

    return {
      exists: true,
      dosimeter: {
        id: dosimeter.id,
        serial_number: dosimeter.serial_number,
        barcode: (dosimeter as any).barcode ?? cleanBarcode,
        internal_code: dosimeter.internal_code,
        lot_number: dosimeter.lot_number,
        model: dosimeter.model,
        manufacturer: dosimeter.manufacturer,
        current_condition: dosimeter.current_condition,
        reusable: dosimeter.reusable,
        status_code: statuses?.code,
        status_name: statuses?.name,
        dosimeter_type_name: types?.name,
        active_holder: activeHolder,
        active_assignment: activeAssignment,
      },
      message: `El dosímetro con código de barras '${cleanBarcode}' ya existe en el sistema.`,
    };
  }
}
