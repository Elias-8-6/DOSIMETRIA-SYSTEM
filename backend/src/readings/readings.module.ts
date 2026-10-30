import { Module } from '@nestjs/common';
import { ReadingsController } from './readings.controller';
import { ReadingsService } from './readings.service';
import { IngestReadingsUseCase } from './use-cases/ingest-readings.use-case';
import { RolesGuard } from '@common/guards/roles.guard';

@Module({
  controllers: [ReadingsController],
  providers: [
    ReadingsService,
    IngestReadingsUseCase,
    RolesGuard,
  ],
  exports: [ReadingsService],
})
export class ReadingsModule {}
