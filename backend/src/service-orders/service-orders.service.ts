import { Injectable } from '@nestjs/common';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { UpdateServiceOrderDto } from './dto/update-service-order.dto';
import { UpdateServiceOrderStatusDto } from './dto/update-service-order-status.dto';
import { CreateServiceOrderItemDto } from './dto/create-service-order-item.dto';
import { CreateDispatchGuideDto } from './dto/create-dispatch-guide.dto';
import { ConfirmDispatchDeliveryDto } from './dto/confirm-dispatch-delivery.dto';
import { CreateReturnGuideDto } from './dto/create-return-guide.dto';
import { FindAllServiceOrdersUseCase } from './use-cases/find-all-service-orders.use-case';
import { FindOneServiceOrderUseCase } from './use-cases/find-one-service-order.use-case';
import { CreateServiceOrderUseCase } from './use-cases/create-service-order.use-case';
import { UpdateServiceOrderUseCase } from './use-cases/update-service-order.use-case';
import { UpdateServiceOrderStatusUseCase } from './use-cases/update-service-order-status.use-case';
import { CancelServiceOrderUseCase } from './use-cases/cancel-service-order.use-case';
import { AddServiceOrderItemUseCase } from './use-cases/add-service-order-item.use-case';
import { RemoveServiceOrderItemUseCase } from './use-cases/remove-service-order-item.use-case';
import { GetClientDosimetersUseCase } from './use-cases/get-client-dosimeters.use-case';
import { SearchDosimetersForOrderUseCase } from './use-cases/search-dosimeters-for-order.use-case';
import { UpdateServiceOrderDocumentDataUseCase } from './use-cases/update-service-order-document-data.use-case';
import { UpdateServiceOrderDocumentDataDto } from './dto/update-service-order-document-data.dto';
import { CreateDispatchGuideUseCase } from './use-cases/create-dispatch-guide.use-case';
import { ConfirmDispatchDeliveryUseCase } from './use-cases/confirm-dispatch-delivery.use-case';
import { CreateReturnGuideUseCase } from './use-cases/create-return-guide.use-case';
import { FindGuidesByOrderUseCase } from './use-cases/find-guides-by-order.use-case';

@Injectable()
export class ServiceOrdersService {
  constructor(
    private readonly findAllServiceOrdersUseCase: FindAllServiceOrdersUseCase,
    private readonly findOneServiceOrderUseCase: FindOneServiceOrderUseCase,
    private readonly createServiceOrderUseCase: CreateServiceOrderUseCase,
    private readonly updateServiceOrderUseCase: UpdateServiceOrderUseCase,
    private readonly updateServiceOrderStatusUseCase: UpdateServiceOrderStatusUseCase,
    private readonly cancelServiceOrderUseCase: CancelServiceOrderUseCase,
    private readonly addServiceOrderItemUseCase: AddServiceOrderItemUseCase,
    private readonly removeServiceOrderItemUseCase: RemoveServiceOrderItemUseCase,
    private readonly getClientDosimetersUseCase: GetClientDosimetersUseCase,
    private readonly searchDosimetersForOrderUseCase: SearchDosimetersForOrderUseCase,
    private readonly updateServiceOrderDocumentDataUseCase: UpdateServiceOrderDocumentDataUseCase,
    private readonly createDispatchGuideUseCase: CreateDispatchGuideUseCase,
    private readonly confirmDispatchDeliveryUseCase: ConfirmDispatchDeliveryUseCase,
    private readonly createReturnGuideUseCase: CreateReturnGuideUseCase,
    private readonly findGuidesByOrderUseCase: FindGuidesByOrderUseCase,
  ) {}

  findAll(
    organizationId: string,
    search?: string,
    status?: string,
    serviceType?: string,
    priority?: string,
    clientId?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    return this.findAllServiceOrdersUseCase.execute(
      organizationId,
      search,
      status,
      serviceType,
      priority,
      clientId,
      page,
      limit,
    );
  }

  findOne(orderId: string, organizationId: string) {
    return this.findOneServiceOrderUseCase.execute(orderId, organizationId);
  }

  create(dto: CreateServiceOrderDto, organizationId: string, requestingUserId: string) {
    return this.createServiceOrderUseCase.execute(dto, organizationId, requestingUserId);
  }

  update(
    orderId: string,
    dto: UpdateServiceOrderDto,
    organizationId: string,
    requestingUserId: string,
  ) {
    return this.updateServiceOrderUseCase.execute(orderId, dto, organizationId, requestingUserId);
  }

  updateStatus(
    orderId: string,
    dto: UpdateServiceOrderStatusDto,
    organizationId: string,
    requestingUserId: string,
  ) {
    return this.updateServiceOrderStatusUseCase.execute(
      orderId,
      dto,
      organizationId,
      requestingUserId,
    );
  }

  cancel(orderId: string, organizationId: string, requestingUserId: string) {
    return this.cancelServiceOrderUseCase.execute(orderId, organizationId, requestingUserId);
  }

  addItem(
    orderId: string,
    dto: CreateServiceOrderItemDto,
    organizationId: string,
    requestingUserId: string,
  ) {
    return this.addServiceOrderItemUseCase.execute(orderId, dto, organizationId, requestingUserId);
  }

  removeItem(
    orderId: string,
    itemId: string,
    organizationId: string,
    requestingUserId: string,
  ) {
    return this.removeServiceOrderItemUseCase.execute(
      orderId,
      itemId,
      organizationId,
      requestingUserId,
    );
  }

  getClientDosimeters(clientId: string, organizationId: string) {
    return this.getClientDosimetersUseCase.execute(clientId, organizationId);
  }

  searchDosimeters(clientId: string, term: string, organizationId: string) {
    return this.searchDosimetersForOrderUseCase.execute(clientId, term, organizationId);
  }

  updateDocumentData(
    orderId: string,
    dto: UpdateServiceOrderDocumentDataDto,
    organizationId: string,
    requestingUserId: string,
  ) {
    return this.updateServiceOrderDocumentDataUseCase.execute(
      orderId,
      dto,
      organizationId,
      requestingUserId,
    );
  }

  // Métodos de Logística Desacoplada (Hojas de Entrega y Devolución)
  createDispatchGuide(orderId: string, dto: CreateDispatchGuideDto, requestingUserId: string) {
    return this.createDispatchGuideUseCase.execute(orderId, dto, requestingUserId);
  }

  confirmDispatchDelivery(guideId: string, dto: ConfirmDispatchDeliveryDto, requestingUserId: string) {
    return this.confirmDispatchDeliveryUseCase.execute(guideId, dto, requestingUserId);
  }

  createReturnGuide(orderId: string, dto: CreateReturnGuideDto, requestingUserId: string) {
    return this.createReturnGuideUseCase.execute(orderId, dto, requestingUserId);
  }

  getDispatchGuide(orderId: string) {
    return this.findGuidesByOrderUseCase.getDispatchGuide(orderId);
  }

  getReturnGuide(orderId: string) {
    return this.findGuidesByOrderUseCase.getReturnGuide(orderId);
  }

  getLogisticsSummary(orderId: string) {
    return this.findGuidesByOrderUseCase.getLogisticsSummary(orderId);
  }
}
