import { Injectable } from '@nestjs/common';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { UpdateWorkerStatusDto } from './dto/update-worker-status.dto';
import { FindAllWorkersUseCase } from './use-case/find-all-workers.use-case';
import { FindOneClientUseCase } from '@clients/use-cases/find-one-client.use-case';
import { CreateWorkerUseCase } from './use-case/create-worker.use-case';
import { UpdateWorkerUseCase } from './use-case/update-worker.use-case';
import { UpdateWorkerStatusUseCase } from './use-case/update-worker-status.use-case';

@Injectable()
export class WorkersService {
  constructor(
    private readonly findAllWorkersUseCase: FindAllWorkersUseCase,
    //private readonly findOneClientUseCase: FindOneClientUseCase,
    private readonly createWorkerUseCase: CreateWorkerUseCase,
    private readonly updateWorkerUseCase: UpdateWorkerUseCase,
    private readonly updateWorkerStatusUseCase: UpdateWorkerStatusUseCase,
  ) {}

  findAll(
    organizationId: string,
    search?: string,
    status?: string,
    clientId?: string,
    clientLocationId?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    return this.findAllWorkersUseCase.execute(
      organizationId,
      search,
      status,
      clientId,
      clientLocationId,
      page,
      limit,
    );
  }

  findOne(workerId: string, organizationId: string) {
    return true;
    //return this.findOneClientUseCase.execute(workerId, organizationId);
  }

  create(dto: CreateWorkerDto, organizationId: string, requestingUserId: string) {
    return this.createWorkerUseCase.execute(dto, organizationId, requestingUserId);
  }

  update(workerId: string, dto: UpdateWorkerDto, organizationId: string, requestingUserId: string) {
    return this.updateWorkerUseCase.execute(workerId, dto, organizationId, requestingUserId);
  }

  updateStatus(
    workerId: string,
    dto: UpdateWorkerStatusDto,
    organizationId: string,
    requestingUserId: string,
  ) {
    return this.updateWorkerStatusUseCase.execute(workerId, dto, organizationId, requestingUserId);
  }
}
