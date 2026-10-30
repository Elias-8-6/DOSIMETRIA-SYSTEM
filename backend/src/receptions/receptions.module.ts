import { Module } from '@nestjs/common';
import { ReceptionsController } from './receptions.controller';
import { ReceptionsService } from './receptions.service';
import { CreateReceptionUseCase } from './use-cases/create-reception.use-case';
import { FindAllReceptionsUseCase } from './use-cases/find-all-receptions.use-case';
import { FindOneReceptionUseCase } from './use-cases/find-one-reception.use-case';
import { GetPendingOrdersForReceptionUseCase } from './use-cases/get-pending-orders-for-reception.use-case';
import { UpdateReceptionUseCase } from './use-cases/update-reception.use-case';
import { UploadReceptionPhotoUseCase } from './use-cases/upload-reception-photo.use-case';
import { CreateSurveyMeterUseCase } from './use-cases/create-survey-meter.use-case';
import { FindSurveyMetersUseCase } from './use-cases/find-survey-meters.use-case';
import { ProcessTriageScanUseCase } from './use-cases/process-triage-scan.use-case';
import { QuarantineDosimetersUseCase } from './use-cases/quarantine-dosimeters.use-case';
import { RolesGuard } from '@common/guards/roles.guard';

@Module({
  controllers: [ReceptionsController],
  providers: [
    ReceptionsService,
    CreateReceptionUseCase,
    FindAllReceptionsUseCase,
    FindOneReceptionUseCase,
    GetPendingOrdersForReceptionUseCase,
    UpdateReceptionUseCase,
    UploadReceptionPhotoUseCase,
    CreateSurveyMeterUseCase,
    FindSurveyMetersUseCase,
    ProcessTriageScanUseCase,
    QuarantineDosimetersUseCase,
    RolesGuard,
  ],
  exports: [ReceptionsService],
})
export class ReceptionsModule {}
