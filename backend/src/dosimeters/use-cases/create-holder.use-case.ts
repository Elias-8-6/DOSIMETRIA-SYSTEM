import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AuditService } from '@common/services/audit.service';
import { CreateHolderDto } from '../dto/create-holder.dto';

@Injectable()
export class CreateHolderUseCase {
  private readonly logger = new Logger(CreateHolderUseCase.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  async execute(dto: CreateHolderDto, requestingUserId: string) {
    const supabase = this.supabase.getClient();

    // Validar unicidad de código de barras
    const { data: existingBarcode } = await supabase
      .from('holder_dosimeters')
      .select('id')
      .eq('barcode', dto.barcode)
      .maybeSingle();

    if (existingBarcode) {
      throw new ConflictException(`Ya existe un portadosímetro con el código de barras '${dto.barcode}'`);
    }

    // Validar unicidad de número de serie
    const { data: existingSerial } = await supabase
      .from('holder_dosimeters')
      .select('id')
      .eq('serial_number', dto.serial_number)
      .maybeSingle();

    if (existingSerial) {
      throw new ConflictException(`Ya existe un portadosímetro con el número de serie '${dto.serial_number}'`);
    }

    const { data: newHolder, error } = await supabase
      .from('holder_dosimeters')
      .insert({
        barcode: dto.barcode,
        serial_number: dto.serial_number,
        holder_color: dto.holder_color ?? 'azul',
        clip_type: dto.clip_type ?? 'pinza_cocodrilo',
        current_condition: dto.current_condition ?? 'integro',
        status: 'disponible',
        notes: dto.notes ?? null,
        photo_url: dto.photo_url ?? null,
      })
      .select()
      .single();

    if (error || !newHolder) {
      this.logger.error('Error al registrar portadosímetro:', error);
      throw new Error(`No se pudo crear el portadosímetro: ${error?.message}`);
    }

    await this.audit.log({
      userId: requestingUserId,
      entityName: 'holder_dosimeters',
      entityId: newHolder.id,
      action: 'CREATE',
      newValues: {
        barcode: newHolder.barcode,
        serial_number: newHolder.serial_number,
        status: newHolder.status,
      },
    });

    return newHolder;
  }
}
