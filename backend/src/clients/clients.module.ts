import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { FindAllClientsUseCase } from './use-cases/find-all-clients.use-case';
import { FindOneClientUseCase } from './use-cases/find-one-client.use-case';
import { CreateClientUseCase } from './use-cases/create-client.use-case';
import { UpdateClientUseCase } from './use-cases/update-client.use-case';
import { UpdateClientStatusUseCase } from './use-cases/update-client-status.use-case';
import { ManageClientLocationsUseCase } from './use-cases/manage-client-locations.use-case';

@Module({
  controllers: [ClientsController],
  providers: [
    ClientsService,
    FindAllClientsUseCase,
    FindOneClientUseCase,
    CreateClientUseCase,
    UpdateClientUseCase,
    UpdateClientStatusUseCase,
    ManageClientLocationsUseCase,
  ],
})
export class ClientsModule {}
