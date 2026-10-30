import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AuditService } from '@common/services/audit.service';
import { ConfirmDispatchDeliveryDto } from '../dto/confirm-dispatch-delivery.dto';

@Injectable()
export class ConfirmDispatchDeliveryUseCase {
  private readonly logger = new Logger(ConfirmDispatchDeliveryUseCase.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  async execute(guideId: string, dto: ConfirmDispatchDeliveryDto, requestingUserId: string) {
    const supabase = this.supabase.getClient();

    const { data: guide, error } = await supabase
      .from('dispatch_guides')
      .select('id, guide_number, status, service_order_id')
      .eq('id', guideId)
      .maybeSingle();

    if (error || !guide) {
      throw new NotFoundException('Hoja de Entrega no encontrada');
    }

    if (guide.status === 'entregada') {
      throw new ConflictException('La entrega ya ha sido confirmada previamente');
    }

    if (guide.status === 'anulada') {
      throw new ConflictException('No se puede confirmar una guía de entrega anulada');
    }

    const { data: updatedGuide, error: updateErr } = await supabase
      .from('dispatch_guides')
      .update({
        status: 'entregada',
        client_receiver_name: dto.client_receiver_name,
        client_signature_url: dto.client_signature_url ?? null,
        observations: dto.observations ?? null,
      })
      .eq('id', guideId)
      .select()
      .single();

    if (updateErr || !updatedGuide) {
      this.logger.error('Error al confirmar entrega:', updateErr);
      throw new Error(`Error al confirmar entrega: ${updateErr?.message}`);
    }

    await this.audit.log({
      userId: requestingUserId,
      entityName: 'dispatch_guides',
      entityId: guideId,
      action: 'UPDATE',
      oldValues: { status: guide.status },
      newValues: {
        status: 'entregada',
        client_receiver_name: dto.client_receiver_name,
        has_signature: Boolean(dto.client_signature_url),
      },
    });

    return {
      message: 'Entrega en cliente confirmada exitosamente',
      dispatch_guide: updatedGuide,
    };
  }
}
