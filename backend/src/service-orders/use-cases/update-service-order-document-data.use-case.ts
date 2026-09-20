import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AuditService } from '@common/services/audit.service';
import { OrganizationScopeService } from '@common/services/organization-scope.service';
import { UpdateServiceOrderDocumentDataDto } from '../dto/update-service-order-document-data.dto';

@Injectable()
export class UpdateServiceOrderDocumentDataUseCase {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
    private readonly orgScope: OrganizationScopeService,
  ) {}

  async execute(
    orderId: string,
    dto: UpdateServiceOrderDocumentDataDto,
    organizationId: string,
    requestingUserId: string,
  ) {
    const supabase = this.supabase.getClient();

    const { data: order, error: fetchError } = await supabase
      .from('service_orders')
      .select('id, client_id, status, document_data, clients(organization_id)')
      .eq('id', orderId)
      .maybeSingle();

    if (fetchError || !order) {
      throw new NotFoundException('Orden de servicio no encontrada');
    }

    const orgType = await this.orgScope.getOrganizationType(organizationId);
    const client = order.clients as unknown as { organization_id: string } | null;

    if (orgType === 'client' && client?.organization_id !== organizationId) {
      throw new NotFoundException('Orden de servicio no encontrada');
    }

    if (order.status === 'CANCELLED') {
      throw new BadRequestException('No se pueden editar documentos de una orden cancelada');
    }

    const oldDocumentData = order.document_data ?? {};
    const newDocumentData = {
      ...oldDocumentData,
      ...dto.document_data,
    };

    const { data: updated, error: updateError } = await supabase
      .from('service_orders')
      .update({ document_data: newDocumentData })
      .eq('id', orderId)
      .select('id, document_data')
      .single();

    if (updateError || !updated) {
      throw new Error('Error al actualizar los datos de los documentos');
    }

    // Registro inmutable de trazabilidad ISO 17025
    await this.audit.log({
      userId: requestingUserId,
      entityName: 'service_orders',
      entityId: orderId,
      action: 'UPDATE',
      oldValues: { document_data: oldDocumentData },
      newValues: { document_data: newDocumentData },
    });

    return updated;
  }
}
