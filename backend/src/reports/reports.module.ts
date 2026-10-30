import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { GenerateMonthlyReportUseCase } from './use-cases/generate-monthly-report.use-case';
import { GenerateWorkerHistoryUseCase } from './use-cases/generate-worker-history.use-case';
import { GenerateUrgentExcessiveDoseReportUseCase } from './use-cases/generate-urgent-excessive-dose-report.use-case';
import { FindOfficialReportsUseCase } from './use-cases/find-official-reports.use-case';
import { GetReportByIdUseCase } from './use-cases/get-report-by-id.use-case';
import { GetExcessiveDoseAlertsUseCase } from './use-cases/get-excessive-dose-alerts.use-case';

@Module({
  controllers: [ReportsController],
  providers: [
    ReportsService,
    GenerateMonthlyReportUseCase,
    GenerateWorkerHistoryUseCase,
    GenerateUrgentExcessiveDoseReportUseCase,
    FindOfficialReportsUseCase,
    GetReportByIdUseCase,
    GetExcessiveDoseAlertsUseCase,
  ],
  exports: [ReportsService],
})
export class ReportsModule {}
