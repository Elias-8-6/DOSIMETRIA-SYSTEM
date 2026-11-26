import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AuditService } from '@common/services/audit.service';
import { OrganizationScopeService } from '@common/services/organization-scope.service';
import { UpdateDosimeterDto } from '../dto/update-dosimeter.dto';
import { isMissingBarcodeColumnError } from '../utils/barcode-column.util';

export interface UpdatedDosimeterRecord {
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
}

@Injectable()
export class UpdateDosimeterUseCase {
  private readonly logger = new Logger(UpdateDosimeterUseCase.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
    private readonly orgScope: OrganizationScopeService,
  ) {}

  async execute(
    dosimeterId: string,
    dto: UpdateDosimeterDto,
    organizationId: string,
    requestingUserId: string,
  ): Promise<UpdatedDosimeterRecord> {
    const orgType = await this.orgScope.getOrganizationType(organizationId);
    if (orgType !== 'laboratory') {
      throw new ForbiddenException('Solo el laboratorio puede editar dosímetros');
    }

    const supabase = this.supabase.getClient();

    let { data: existing, error: existingError } = await supabase
      .from('dosimeters')
      .select('id, serial_number, barcode, internal_code')
      .eq('id', dosimeterId)
      .maybeSingle();

    if (existingError && isMissingBarcodeColumnError(existingError)) {
      const fallbackExisting = await supabase
        .from('dosimeters')
        .select('id, serial_number, internal_code')
        .eq('id', dosimeterId)
        .maybeSingle();

      if (!fallbackExisting.error && fallbackExisting.data) {
        existing = {
          ...fallbackExisting.data,
          barcode: fallbackExisting.data.serial_number,
        };
        existingError = null;
      } else {
        existingError = fallbackExisting.error;
      }
    }

    if (existingError) {
      this.logger.error(`Error consultando dosímetro ${dosimeterId}:`, existingError);
      throw new Error(`Error al consultar dosímetro: ${existingError.message}`);
    }

    if (!existing) throw new NotFoundException('Dosímetro no encontrado');

    let cleanSerial: string | undefined = undefined;
    if (dto.serial_number !== undefined) {
      cleanSerial = dto.serial_number.trim();
      if (!cleanSerial || cleanSerial.length < 3) {
        throw new BadRequestException('El número de serie debe tener al menos 3 caracteres');
      }
      if (cleanSerial !== existing.serial_number) {
        const { data: conflict } = await supabase
          .from('dosimeters')
          .select('id')
          .eq('serial_number', cleanSerial)
          .neq('id', dosimeterId)
          .maybeSingle();
        if (conflict) {
          throw new ConflictException(
            `Ya existe un dosímetro con el número de serie '${cleanSerial}'`,
          );
        }
      }
    }

    let cleanBarcode: string | undefined = undefined;
    if (dto.barcode !== undefined) {
      cleanBarcode = dto.barcode.trim();
      if (!cleanBarcode || cleanBarcode.length < 3) {
        throw new BadRequestException('El código de barras debe tener al menos 3 caracteres');
      }
      if (cleanBarcode !== existing.barcode) {
        const { data: conflict } = await supabase
          .from('dosimeters')
          .select('id')
          .eq('barcode', cleanBarcode)
          .neq('id', dosimeterId)
          .maybeSingle();
        if (conflict) {
          throw new ConflictException(
            `Ya existe un dosímetro con el código de barras '${cleanBarcode}'`,
          );
        }
      }
    }

    let cleanInternalCode: string | null | undefined = undefined;
    if (dto.internal_code !== undefined) {
      cleanInternalCode = dto.internal_code ? dto.internal_code.trim() : null;
      if (cleanInternalCode === '') cleanInternalCode = null;
      if (cleanInternalCode && cleanInternalCode !== existing.internal_code) {
        const { data: conflict } = await supabase
          .from('dosimeters')
          .select('id')
          .eq('internal_code', cleanInternalCode)
          .neq('id', dosimeterId)
          .maybeSingle();
        if (conflict) {
          throw new ConflictException(`El código interno '${cleanInternalCode}' ya está en uso`);
        }
      }
    }

    let updateResult = await supabase
      .from('dosimeters')
      .update({
        ...(cleanSerial !== undefined && { serial_number: cleanSerial }),
        ...(cleanBarcode !== undefined && { barcode: cleanBarcode }),
        ...(dto.dosimeter_type_id !== undefined && { dosimeter_type_id: dto.dosimeter_type_id }),
        ...(cleanInternalCode !== undefined && { internal_code: cleanInternalCode }),
        ...(dto.lot_number !== undefined && { lot_number: dto.lot_number }),
        ...(dto.manufacture_date !== undefined && { manufacture_date: dto.manufacture_date }),
        ...(dto.commissioning_date !== undefined && {
          commissioning_date: dto.commissioning_date,
        }),
        ...(dto.wear_period_days !== undefined && { wear_period_days: dto.wear_period_days }),
        ...(dto.max_dose_limit !== undefined && { max_dose_limit: dto.max_dose_limit }),
        ...(dto.last_annealing_date !== undefined && {
          last_annealing_date: dto.last_annealing_date,
        }),
        ...(dto.current_condition !== undefined && { current_condition: dto.current_condition }),
        ...(dto.reusable !== undefined && { reusable: dto.reusable }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.model !== undefined && { model: dto.model }),
        ...(dto.manufacturer !== undefined && { manufacturer: dto.manufacturer }),
        ...(dto.photo_url !== undefined && { photo_url: dto.photo_url }),
      })
      .eq('id', dosimeterId)
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

    if (updateResult.error && isMissingBarcodeColumnError(updateResult.error)) {
      this.logger.warn('Columna barcode ausente en BD al actualizar dosímetro. Actualizando sin barcode.');
      const fallbackUpdate = await supabase
        .from('dosimeters')
        .update({
          ...(cleanSerial !== undefined && { serial_number: cleanSerial }),
          ...(dto.dosimeter_type_id !== undefined && { dosimeter_type_id: dto.dosimeter_type_id }),
          ...(cleanInternalCode !== undefined && { internal_code: cleanInternalCode }),
          ...(dto.lot_number !== undefined && { lot_number: dto.lot_number }),
          ...(dto.manufacture_date !== undefined && { manufacture_date: dto.manufacture_date }),
          ...(dto.commissioning_date !== undefined && {
            commissioning_date: dto.commissioning_date,
          }),
          ...(dto.wear_period_days !== undefined && { wear_period_days: dto.wear_period_days }),
          ...(dto.max_dose_limit !== undefined && { max_dose_limit: dto.max_dose_limit }),
          ...(dto.last_annealing_date !== undefined && {
            last_annealing_date: dto.last_annealing_date,
          }),
          ...(dto.current_condition !== undefined && { current_condition: dto.current_condition }),
          ...(dto.reusable !== undefined && { reusable: dto.reusable }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
          ...(dto.model !== undefined && { model: dto.model }),
          ...(dto.manufacturer !== undefined && { manufacturer: dto.manufacturer }),
          ...(dto.photo_url !== undefined && { photo_url: dto.photo_url }),
        })
        .eq('id', dosimeterId)
        .select(
          `
          id, serial_number, internal_code, lot_number,
          manufacture_date, commissioning_date, wear_period_days,
          max_dose_limit, last_annealing_date, current_condition,
          reusable, notes, model, manufacturer, photo_url, created_at,
          dosimeter_types(id, code, name, technology),
          dosimeter_statuses(id, code, name)
        `,
        )
        .single();

      if (!fallbackUpdate.error && fallbackUpdate.data) {
        updateResult = {
          data: {
            ...fallbackUpdate.data,
            barcode: (fallbackUpdate.data as any).serial_number,
          },
          error: null,
        } as any;
      } else {
        updateResult = fallbackUpdate as any;
      }
    }

    const { data, error } = updateResult;

    if (error) throw new Error(error.message);

    await this.audit.log({
      userId: requestingUserId,
      entityName: 'dosimeters',
      entityId: dosimeterId,
      action: 'UPDATE',
      oldValues: {
        serial_number: existing.serial_number,
        barcode: existing.barcode,
        internal_code: existing.internal_code,
      },
      newValues: dto as unknown as Record<string, unknown>,
    });

    return data as unknown as UpdatedDosimeterRecord;
  }
}
