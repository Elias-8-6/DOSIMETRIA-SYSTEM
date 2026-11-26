import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AuditService } from '@common/services/audit.service';
import { OrganizationScopeService } from '@common/services/organization-scope.service';
import { CreateDosimeterDto } from '../dto/create-dosimeter.dto';

export interface CreatedDosimeterRecord {
  id: string;
  serial_number: string;
  barcode: string;
  internal_code?: string | null;
  lot_number?: string | null;
  manufacture_date?: string | null;
  commissioning_date?: string | null;
  wear_period_days?: number | null;
  max_dose_limit?: number | null;
  last_annealing_date?: string | null;
  current_condition: string;
  reusable: boolean;
  notes?: string | null;
  model?: string | null;
  manufacturer?: string | null;
  photo_url?: string | null;
  created_at: string;
  dosimeter_types?: unknown;
  dosimeter_statuses?: unknown;
}

@Injectable()
export class CreateDosimeterUseCase {
  private readonly logger = new Logger(CreateDosimeterUseCase.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
    private readonly orgScope: OrganizationScopeService,
  ) {}

  async execute(dto: CreateDosimeterDto, organizationId: string, requestingUserId: string): Promise<CreatedDosimeterRecord> {
    const orgType = await this.orgScope.getOrganizationType(organizationId);
    if (orgType !== 'laboratory') {
      throw new ForbiddenException('Solo el laboratorio puede registrar dosímetros');
    }

    const client = this.supabase.getClient();

    const cleanSerial = (dto.serial_number || '').trim();
    if (!cleanSerial || cleanSerial.length < 3) {
      throw new BadRequestException('El número de serie es obligatorio y debe tener al menos 3 caracteres');
    }

    const { data: existingSerial } = await client
      .from('dosimeters')
      .select('id')
      .eq('serial_number', cleanSerial)
      .maybeSingle();

    if (existingSerial) {
      throw new ConflictException(
        `Ya existe un dosímetro con el número de serie '${dto.serial_number}'`,
      );
    }

    // Resolver código de barras (físico o autogenerado)
    let finalBarcode = dto.barcode?.trim();
    if (dto.auto_generate_barcode || !finalBarcode) {
      finalBarcode = await this.generateUniqueBarcode();
    }

    // Validar unicidad del código de barras
    const { data: existingBarcode } = await client
      .from('dosimeters')
      .select('id')
      .eq('barcode', finalBarcode)
      .maybeSingle();

    if (existingBarcode) {
      throw new ConflictException(
        `Ya existe un dosímetro con el código de barras '${finalBarcode}'`,
      );
    }

    if (dto.internal_code) {
      const { data: existingCode } = await client
        .from('dosimeters')
        .select('id')
        .eq('internal_code', dto.internal_code.trim())
        .maybeSingle();

      if (existingCode) {
        throw new ConflictException(`El código interno '${dto.internal_code}' ya está en uso`);
      }
    }

    const { data: availableStatus, error: statusError } = await client
      .from('dosimeter_statuses')
      .select('id')
      .eq('code', 'DISPONIBLE')
      .single();

    if (statusError || !availableStatus) {
      throw new Error('No se pudo resolver el estado inicial DISPONIBLE');
    }

    const { data: newDosimeter, error } = await client
      .from('dosimeters')
      .insert({
        dosimeter_type_id: dto.dosimeter_type_id,
        status_id: availableStatus.id,
        serial_number: dto.serial_number.trim(),
        barcode: finalBarcode,
        internal_code: dto.internal_code ? dto.internal_code.trim() : null,
        lot_number: dto.lot_number ?? null,
        manufacture_date: dto.manufacture_date ?? null,
        commissioning_date: dto.commissioning_date ?? null,
        wear_period_days: dto.wear_period_days ?? null,
        max_dose_limit: dto.max_dose_limit ?? null,
        last_annealing_date: dto.last_annealing_date ?? null,
        current_condition: dto.current_condition ?? 'normal',
        reusable: dto.reusable ?? true,
        notes: dto.notes ?? null,
        model: dto.model ?? null,
        manufacturer: dto.manufacturer ?? null,
        photo_url: dto.photo_url ?? null,
      })
      .select(
        `
        id, serial_number, barcode, internal_code, lot_number,
        manufacture_date, commissioning_date, wear_period_days,
        max_dose_limit, last_annealing_date, current_condition,
        reusable, notes, model, manufacturer, photo_url, created_at,
        dosimeter_types(id, code, name, technology),
        dosimeter_statuses(id, code, name)
      `,
      )
      .single();

    if (error || !newDosimeter) {
      this.logger.error('Error al crear dosímetro:', error);
      if (error?.code === '23505') {
        throw new ConflictException('El número de serie, código de barras o código interno ya existe.');
      }
      throw new Error('No se pudo crear el dosímetro');
    }

    await this.audit.log({
      userId: requestingUserId,
      entityName: 'dosimeters',
      entityId: newDosimeter.id,
      action: 'CREATE',
      newValues: {
        serial_number: newDosimeter.serial_number,
        barcode: newDosimeter.barcode,
        internal_code: newDosimeter.internal_code,
      },
    });

    return newDosimeter as unknown as CreatedDosimeterRecord;
  }

  private async generateUniqueBarcode(): Promise<string> {
    const supabase = this.supabase.getClient();
    const prefix = 'DOS';
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    for (let attempts = 0; attempts < 5; attempts++) {
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      const candidate = `${prefix}-${yearMonth}-${randomPart}`;

      const { data } = await supabase
        .from('dosimeters')
        .select('id')
        .eq('barcode', candidate)
        .maybeSingle();

      if (!data) {
        return candidate;
      }
    }

    return `${prefix}-${yearMonth}-${Date.now().toString(36).toUpperCase()}`;
  }
}
