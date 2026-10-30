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
import { UploadDosimeterPhotoUseCase } from './use-cases/upload-dosimeter-photo.use-case';
import { CreateHolderUseCase } from './use-cases/create-holder.use-case';
import { CreateTldCardUseCase } from './use-cases/create-tld-card.use-case';
import { AssembleDosimeterUseCase } from './use-cases/assemble-dosimeter.use-case';
import { DisassembleDosimeterUseCase } from './use-cases/disassemble-dosimeter.use-case';
import { FindHoldersUseCase } from './use-cases/find-holders.use-case';
import { FindTldCardsUseCase } from './use-cases/find-tld-cards.use-case';
import { RolesGuard } from '@common/guards/roles.guard';

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
    UploadDosimeterPhotoUseCase,
    CreateHolderUseCase,
    CreateTldCardUseCase,
    AssembleDosimeterUseCase,
    DisassembleDosimeterUseCase,
    FindHoldersUseCase,
    FindTldCardsUseCase,
    RolesGuard,
  ],
  exports: [DosimetersService],
})
export class DosimetersModule {}
