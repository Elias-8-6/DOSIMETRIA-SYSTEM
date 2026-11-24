import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AuditService } from '@common/services/audit.service';

@Injectable()
export class DeleteHolderUseCase {
  private readonly logger = new Logger(DeleteHolderUseCase.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  async execute(id: string, requestingUserId: string) {
    const supabase = this.supabase.getClient();

    const { data: holder, error: findError } = await supabase
      .from('holder_dosimeters')
      .select('id, barcode, serial_number, status, current_condition')
      .eq('id', id)
      .maybeSingle();

    if (findError) {
      throw new Error(`Error al consultar portadosímetro: ${findError.message}`);
    }

    if (!holder) {
      throw new NotFoundException(`No existe un portadosímetro con id '${id}'`);
    }

    if (holder.status === 'en_campo') {
      throw new BadRequestException(
        'No se puede dar de baja el portadosímetro porque actualmente se encuentra en campo asignado a un usuario.',
      );
    }

    // Validar que no tenga asignaciones activas abiertas
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

    // Validar que no tenga ensamble activo
    const { data: activeAssembly } = await supabase
      .from('holder_tld_assemblies')
      .select('id')
      .eq('holder_id', id)
      .eq('is_active', true)
      .maybeSingle();

    if (activeAssembly) {
      throw new BadRequestException(
        'No se puede retirar el portadosímetro porque tiene un dosímetro o tarjeta TLD montada activamente. Debe desensamblarlo primero.',
      );
    }

    // Aplicar baja lógica (ISO 17025 trazabilidad)
    const { data: updatedHolder, error: updateError } = await supabase
      .from('holder_dosimeters')
      .update({ status: 'baja' })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updatedHolder) {
      this.logger.error('Error al dar de baja portadosímetro:', updateError);
      throw new Error(`No se pudo dar de baja el portadosímetro: ${updateError?.message}`);
    }

    await this.audit.log({
      userId: requestingUserId,
      entityName: 'holder_dosimeters',
      entityId: id,
      action: 'DELETE',
      oldValues: {
        status: holder.status,
      },
      newValues: {
        status: 'baja',
      },
    });

    return {
      message: `El portadosímetro con código '${holder.barcode}' ha sido dado de baja correctamente.`,
      holder: updatedHolder,
    };
  }
}
