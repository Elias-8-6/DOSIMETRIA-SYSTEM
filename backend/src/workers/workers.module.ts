import { Module } from '@nestjs/common';
import { WorkersController } from './workers.controller';
import { WorkersService } from './workers.service';
import { FindAllWorkersUseCase } from './use-case/find-all-workers.use-case';
import { FindOneWorkerUseCase } from './use-case/find-one-worker.use-case';
import { CreateWorkerUseCase } from './use-case/create-worker.use-case';
import { UpdateWorkerUseCase } from './use-case/update-worker.use-case';
import { UpdateWorkerStatusUseCase } from './use-case/update-worker-status.use-case';

@Module({
  controllers: [WorkersController],
  providers: [
    WorkersService,
    FindAllWorkersUseCase,
    FindOneWorkerUseCase,
    CreateWorkerUseCase,
    UpdateWorkerUseCase,
    UpdateWorkerStatusUseCase,
  ],
})
export class WorkersModule {}
