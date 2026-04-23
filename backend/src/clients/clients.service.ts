import { Injectable } from '@nestjs/common';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { UpdateClientStatusDto } from './dto/update-client-status.dto';
import { CreateClientLocationDto } from './dto/create-client-location.dto';
import { FindAllClientsUseCase } from './use-cases/find-all-clients.use-case';
import { FindOneClientUseCase } from './use-cases/find-one-client.use-case';
import { CreateClientUseCase } from './use-cases/create-client.use-case';
import { UpdateClientUseCase } from './use-cases/update-client.use-case';
import { UpdateClientStatusUseCase } from './use-cases/update-client-status.use-case';
import { ManageClientLocationsUseCase } from './use-cases/manage-client-locations.use-case';

@Injectable()
export class ClientsService {
  constructor(
    private readonly findAllClientsUseCase: FindAllClientsUseCase,
    private readonly findOneClientUseCase: FindOneClientUseCase,
    private readonly createClientUseCase: CreateClientUseCase,
    private readonly updateClientUseCase: UpdateClientUseCase,
    private readonly updateClientStatusUseCase: UpdateClientStatusUseCase,
    private readonly manageClientLocationsUseCase: ManageClientLocationsUseCase,
  ) {}

  findAll(organizationId: string, search?: string, status?: string, clientType?: string) {
    return this.findAllClientsUseCase.execute(organizationId, search, status, clientType);
  }

  findOne(clientId: string, organizationId: string) {
    return this.findOneClientUseCase.execute(clientId, organizationId);
  }

  create(dto: CreateClientDto, organizationId: string, requestingUserId: string) {
    return this.createClientUseCase.execute(dto, organizationId, requestingUserId);
  }

  update(clientId: string, dto: UpdateClientDto, organizationId: string, requestingUserId: string) {
    return this.updateClientUseCase.execute(clientId, dto, organizationId, requestingUserId);
  }

  updateStatus(
    clientId: string,
    dto: UpdateClientStatusDto,
    organizationId: string,
    requestingUserId: string,
  ) {
    return this.updateClientStatusUseCase.execute(clientId, dto, organizationId, requestingUserId);
  }

  createLocation(clientId: string, dto: CreateClientLocationDto, organizationId: string) {
    return this.manageClientLocationsUseCase.create(clientId, dto, organizationId);
  }

  updateLocation(
    clientId: string,
    locationId: string,
    dto: Partial<CreateClientLocationDto>,
    organizationId: string,
  ) {
    return this.manageClientLocationsUseCase.update(clientId, locationId, dto, organizationId);
  }

  updateLocationStatus(
    clientId: string,
    locationId: string,
    status: 'active' | 'inactive',
    organizationId: string,
  ) {
    return this.manageClientLocationsUseCase.updateStatus(
      clientId,
      locationId,
      status,
      organizationId,
    );
  }
}
