import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AuditService } from '@common/services/audit.service';
import { CreateHolderDto } from '../dto/create-holder.dto';

export interface CreatedHolderRecord {
  id: string;
  barcode: string;
  serial_number: string;
  holder_color?: string;
  clip_type?: string;
  current_condition: string;
  status: string;
  [key: string]: unknown;
}

@Injectable()
export class CreateHolderUseCase {
  private readonly logger = new Logger(CreateHolderUseCase.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  async execute(dto: CreateHolderDto, requestingUserId: string) {
    const supabase = this.supabase.getClient();

    let finalBarcode = dto.barcode?.trim();

    // Si se solicita autogeneración o no viene código de barras
    if (dto.auto_generate_barcode || !finalBarcode) {
      finalBarcode = await this.generateUniqueBarcode();
    }

    if (!finalBarcode) {
      throw new BadRequestException('El código de barras es requerido o debe solicitarse autogeneración.');
    }

    // Si no se proporcionó número de serie independiente, se iguala al código de barras
    const finalSerialNumber = dto.serial_number?.trim() || finalBarcode;

    // Validar unicidad previa de código de barras
    const { data: existingBarcode } = await supabase
      .from('holder_dosimeters')
      .select('id, barcode, serial_number, status, current_condition')
      .eq('barcode', finalBarcode)
      .maybeSingle();

    if (existingBarcode) {
      throw new ConflictException(
        `Ya existe un portadosímetro con el código de barras '${finalBarcode}' (Estado: ${existingBarcode.status}, Condición: ${existingBarcode.current_condition})`,
      );
    }

    // Validar unicidad previa de número de serie si es distinto del código de barras
    if (finalSerialNumber !== finalBarcode) {
      const { data: existingSerial } = await supabase
        .from('holder_dosimeters')
        .select('id, serial_number')
        .eq('serial_number', finalSerialNumber)
        .maybeSingle();

      if (existingSerial) {
        throw new ConflictException(
          `Ya existe un portadosímetro con el número de serie '${finalSerialNumber}'`,
        );
      }
    }

    const basePayload: Record<string, any> = {
      barcode: finalBarcode,
      serial_number: finalSerialNumber,
      holder_color: dto.holder_color ?? 'azul',
      clip_type: dto.clip_type ?? 'pinza_cocodrilo',
      current_condition: dto.current_condition ?? 'integro',
      status: 'disponible',
      notes: dto.notes ?? null,
      photo_url: dto.photo_url ?? null,
    };

    let newHolder!: CreatedHolderRecord;

    // Intento con campos extendidos (si la migración 011 ya fue aplicada)
    if (dto.model || dto.storage_location) {
      const extendedPayload = {
        ...basePayload,
        ...(dto.model ? { model: dto.model } : {}),
        ...(dto.storage_location ? { storage_location: dto.storage_location } : {}),
      };

      const { data, error } = await supabase
        .from('holder_dosimeters')
        .insert(extendedPayload)
        .select()
        .single();

      if (!error && data) {
        newHolder = data;
      } else {
        this.logger.warn(
          'Fallo al insertar con campos extendidos (posiblemente migración 011 pendiente), reintentando con campos base...',
          error?.message,
        );
      }
    }

    // Si no se usaron campos extendidos o falló por falta de columnas en BD
    if (!newHolder) {
      const { data, error } = await supabase
        .from('holder_dosimeters')
        .insert(basePayload)
        .select()
        .single();

      if (error || !data) {
        this.logger.error('Error al registrar portadosímetro:', error);
        throw new Error(`No se pudo crear el portadosímetro: ${error?.message}`);
      }
      newHolder = data;
    }

    await this.audit.log({
      userId: requestingUserId,
      entityName: 'holder_dosimeters',
      entityId: newHolder.id,
      action: 'CREATE',
      newValues: {
        barcode: newHolder.barcode,
        serial_number: newHolder.serial_number,
        holder_color: newHolder.holder_color,
        clip_type: newHolder.clip_type,
        current_condition: newHolder.current_condition,
        status: newHolder.status,
      },
    });

    return newHolder;
  }

  private async generateUniqueBarcode(): Promise<string> {
    const supabase = this.supabase.getClient();
    const prefix = 'HLD';
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    for (let attempts = 0; attempts < 5; attempts++) {
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      const candidate = `${prefix}-${yearMonth}-${randomPart}`;

      const { data } = await supabase
        .from('holder_dosimeters')
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
