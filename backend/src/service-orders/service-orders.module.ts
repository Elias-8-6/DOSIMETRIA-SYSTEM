import { Module } from '@nestjs/common';
import { ServiceOrdersController } from './service-orders.controller';
import { ServiceOrdersService } from './service-orders.service';
import { FindAllServiceOrdersUseCase } from './use-cases/find-all-service-orders.use-case';
import { FindOneServiceOrderUseCase } from './use-cases/find-one-service-order.use-case';
import { CreateServiceOrderUseCase } from './use-cases/create-service-order.use-case';
import { UpdateServiceOrderUseCase } from './use-cases/update-service-order.use-case';
import { UpdateServiceOrderStatusUseCase } from './use-cases/update-service-order-status.use-case';
import { CancelServiceOrderUseCase } from './use-cases/cancel-service-order.use-case';
import { AddServiceOrderItemUseCase } from './use-cases/add-service-order-item.use-case';
import { RemoveServiceOrderItemUseCase } from './use-cases/remove-service-order-item.use-case';

@Module({
  controllers: [ServiceOrdersController],
  providers: [
    ServiceOrdersService,
    FindAllServiceOrdersUseCase,
    FindOneServiceOrderUseCase,
    CreateServiceOrderUseCase,
    UpdateServiceOrderUseCase,
    UpdateServiceOrderStatusUseCase,
    CancelServiceOrderUseCase,
    AddServiceOrderItemUseCase,
    RemoveServiceOrderItemUseCase,
  ],
})
export class ServiceOrdersModule {}
