import { Module } from '@nestjs/common';
import { DosimetersController } from './dosimeters.controller';
import { DosimetersService } from './dosimeters.service';
import { FindAllDosimetersUseCase } from './use-cases/find-all-dosimeters.use-case';
import { FindOneDosimeterUseCase } from './use-cases/find-one-dosimeter.use-case';
import { CreateDosimeterUseCase } from './use-cases/create-dosimeter.use-case';
import { UpdateDosimeterUseCase } from './use-cases/update-dosimeter.use-case';
import { UpdateDosimeterStatusUseCase } from './use-cases/update-dosimeter-status.use-case';
import { AssignDosimeterUseCase } from './use-cases/assign-dosimeter.use-case';
import { ReturnDosimeterUseCase } from './use-cases/return-dosimeter.use-case';
import { GetDosimeterHistoryUseCase } from './use-cases/get-dosimeter-history.use-case';

@Module({
  controllers: [DosimetersController],
  providers: [
    DosimetersService,
    FindAllDosimetersUseCase,
    FindOneDosimeterUseCase,
    CreateDosimeterUseCase,
    UpdateDosimeterUseCase,
    UpdateDosimeterStatusUseCase,
    AssignDosimeterUseCase,
    ReturnDosimeterUseCase,
    GetDosimeterHistoryUseCase,
  ],
})
export class DosimetersModule {}
