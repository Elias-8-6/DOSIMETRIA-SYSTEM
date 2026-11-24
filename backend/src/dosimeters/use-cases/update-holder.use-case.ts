import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AuditService } from '@common/services/audit.service';
import { UpdateHolderDto } from '../dto/update-holder.dto';

@Injectable()
export class UpdateHolderUseCase {
  private readonly logger = new Logger(UpdateHolderUseCase.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  async execute(id: string, dto: UpdateHolderDto, requestingUserId: string) {
    const supabase = this.supabase.getClient();

    const { data: existingHolder, error: findError } = await supabase
      .from('holder_dosimeters')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (findError) {
      throw new Error(`Error al buscar portadosímetro: ${findError.message}`);
    }

    if (!existingHolder) {
      throw new NotFoundException(`No existe un portadosímetro con id '${id}'`);
    }

    // Validar unicidad si cambia el código de barras
    if (dto.barcode && dto.barcode.trim() !== existingHolder.barcode) {
      const { data: dupBarcode } = await supabase
        .from('holder_dosimeters')
        .select('id')
        .eq('barcode', dto.barcode.trim())
        .neq('id', id)
        .maybeSingle();

      if (dupBarcode) {
        throw new ConflictException(`Ya existe otro portadosímetro con el código de barras '${dto.barcode.trim()}'`);
      }
    }

    // Validar unicidad si cambia el número de serie
    if (dto.serial_number && dto.serial_number.trim() !== existingHolder.serial_number) {
      const { data: dupSerial } = await supabase
        .from('holder_dosimeters')
        .select('id')
        .eq('serial_number', dto.serial_number.trim())
        .neq('id', id)
        .maybeSingle();

      if (dupSerial) {
        throw new ConflictException(`Ya existe otro portadosímetro con el número de serie '${dto.serial_number.trim()}'`);
      }
    }

    // Validar reglas de transición de estado e integridad ISO 17025
    if (dto.status !== undefined && dto.status !== existingHolder.status) {
      if (existingHolder.status === 'en_campo') {
        throw new BadRequestException(
          'No se puede modificar directamente el estado de un portadosímetro que está en campo. Debe registrarse la devolución del dosímetro.',
        );
      }
      if (dto.status === 'baja') {
        const { data: activeAssignment } = await supabase
          .from('dosimeter_assignments')
          .select('id')
          .eq('holder_id', id)
          .is('returned_at', null)
          .maybeSingle();

        if (activeAssignment) {
          throw new BadRequestException(
            'No se puede dar de baja el portadosímetro porque tiene una asignación activa en campo sin retornar.',
          );
        }

        const { data: activeAssembly } = await supabase
          .from('holder_tld_assemblies')
          .select('id')
          .eq('holder_id', id)
          .eq('is_active', true)
          .maybeSingle();

        if (activeAssembly) {
          throw new BadRequestException(
            'No se puede dar de baja el portadosímetro porque tiene un dosímetro o tarjeta TLD montada activamente. Debe desensamblarlo primero.',
          );
        }
      }
      if (dto.status === 'disponible') {
        const { data: activeAssembly } = await supabase
          .from('holder_tld_assemblies')
          .select('id')
          .eq('holder_id', id)
          .eq('is_active', true)
          .maybeSingle();

        if (activeAssembly) {
          throw new BadRequestException(
            'No se puede marcar como disponible porque tiene un ensamble activo. Debe desensamblarlo primero.',
          );
        }
      }
    }

    const updatePayload: Record<string, any> = {};
    if (dto.barcode !== undefined) updatePayload.barcode = dto.barcode.trim();
    if (dto.serial_number !== undefined) updatePayload.serial_number = dto.serial_number.trim();
    if (dto.holder_color !== undefined) updatePayload.holder_color = dto.holder_color;
    if (dto.clip_type !== undefined) updatePayload.clip_type = dto.clip_type;
    if (dto.model !== undefined) updatePayload.model = dto.model ? dto.model.trim() : null;
    if (dto.storage_location !== undefined) updatePayload.storage_location = dto.storage_location ? dto.storage_location.trim() : null;
    if (dto.current_condition !== undefined) updatePayload.current_condition = dto.current_condition;
    if (dto.status !== undefined) updatePayload.status = dto.status;
    if (dto.notes !== undefined) updatePayload.notes = dto.notes ? dto.notes.trim() : null;
    if (dto.photo_url !== undefined) updatePayload.photo_url = dto.photo_url;

    if (Object.keys(updatePayload).length === 0) {
      return existingHolder;
    }

    const { data: updatedHolder, error: updateError } = await supabase
      .from('holder_dosimeters')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updatedHolder) {
      this.logger.error('Error al actualizar portadosímetro:', updateError);
      throw new Error(`No se pudo actualizar el portadosímetro: ${updateError?.message}`);
    }

    await this.audit.log({
      userId: requestingUserId,
      entityName: 'holder_dosimeters',
      entityId: id,
      action: 'UPDATE',
      oldValues: {
        barcode: existingHolder.barcode,
        serial_number: existingHolder.serial_number,
        holder_color: existingHolder.holder_color,
        clip_type: existingHolder.clip_type,
        model: existingHolder.model,
        storage_location: existingHolder.storage_location,
        current_condition: existingHolder.current_condition,
        status: existingHolder.status,
        notes: existingHolder.notes,
      },
      newValues: {
        barcode: updatedHolder.barcode,
        serial_number: updatedHolder.serial_number,
        holder_color: updatedHolder.holder_color,
        clip_type: updatedHolder.clip_type,
        model: updatedHolder.model,
        storage_location: updatedHolder.storage_location,
        current_condition: updatedHolder.current_condition,
        status: updatedHolder.status,
        notes: updatedHolder.notes,
      },
    });

    return updatedHolder;
  }
}
