import { Module } from '@nestjs/common';
import { SupabaseModule } from '@config/supabase.module';
import { ReceptionsController } from './receptions.controller';
import { ReceptionsService } from './receptions.service';
import { CreateReceptionUseCase } from './use-cases/create-reception.use-case';
import { FindAllReceptionsUseCase } from './use-cases/find-all-receptions.use-case';
import { FindOneReceptionUseCase } from './use-cases/find-one-reception.use-case';
import { GetPendingOrdersForReceptionUseCase } from './use-cases/get-pending-orders-for-reception.use-case';
import { UpdateReceptionUseCase } from './use-cases/update-reception.use-case';
import { UploadReceptionPhotoUseCase } from './use-cases/upload-reception-photo.use-case';

@Module({
  imports: [SupabaseModule],
  controllers: [ReceptionsController],
  providers: [
    ReceptionsService,
    CreateReceptionUseCase,
    FindAllReceptionsUseCase,
    FindOneReceptionUseCase,
    GetPendingOrdersForReceptionUseCase,
    UpdateReceptionUseCase,
    UploadReceptionPhotoUseCase,
  ],
  exports: [ReceptionsService],
})
export class ReceptionsModule {}
