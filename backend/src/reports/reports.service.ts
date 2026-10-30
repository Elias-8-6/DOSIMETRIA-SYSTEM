import { Injectable } from '@nestjs/common';
import { GenerateMonthlyReportUseCase } from './use-cases/generate-monthly-report.use-case';
import { GenerateWorkerHistoryUseCase } from './use-cases/generate-worker-history.use-case';
import { GenerateUrgentExcessiveDoseReportUseCase } from './use-cases/generate-urgent-excessive-dose-report.use-case';
import { FindOfficialReportsUseCase } from './use-cases/find-official-reports.use-case';
import { GetReportByIdUseCase } from './use-cases/get-report-by-id.use-case';
import { GetExcessiveDoseAlertsUseCase } from './use-cases/get-excessive-dose-alerts.use-case';
import { GenerateMonthlyReportDto } from './dto/generate-monthly-report.dto';
import { GenerateWorkerHistoryDto } from './dto/generate-worker-history.dto';
import { GenerateExcessiveDoseReportDto } from './dto/generate-excessive-dose-report.dto';
import { QueryReportsDto } from './dto/query-reports.dto';
import { QueryExcessiveDoseAlertsDto } from './dto/query-excessive-dose-alerts.dto';

@Injectable()
export class ReportsService {
  constructor(
    private readonly generateMonthlyReportUseCase: GenerateMonthlyReportUseCase,
    private readonly generateWorkerHistoryUseCase: GenerateWorkerHistoryUseCase,
    private readonly generateUrgentExcessiveDoseReportUseCase: GenerateUrgentExcessiveDoseReportUseCase,
    private readonly findOfficialReportsUseCase: FindOfficialReportsUseCase,
    private readonly getReportByIdUseCase: GetReportByIdUseCase,
    private readonly getExcessiveDoseAlertsUseCase: GetExcessiveDoseAlertsUseCase,
  ) {}

  generateMonthlyReport(dto: GenerateMonthlyReportDto, userId: string, organizationId: string) {
    return this.generateMonthlyReportUseCase.execute(dto, userId, organizationId);
  }

  generateWorkerHistory(dto: GenerateWorkerHistoryDto, userId: string, organizationId: string) {
    return this.generateWorkerHistoryUseCase.execute(dto, userId, organizationId);
  }

  generateUrgentExcessiveDoseReport(
    dto: GenerateExcessiveDoseReportDto,
    userId: string,
    organizationId: string,
  ) {
    return this.generateUrgentExcessiveDoseReportUseCase.execute(dto, userId, organizationId);
  }

  findOfficialReports(dto: QueryReportsDto, organizationId: string) {
    return this.findOfficialReportsUseCase.execute(dto, organizationId);
  }

  getReportById(reportId: string, organizationId: string) {
    return this.getReportByIdUseCase.execute(reportId, organizationId);
  }

  getExcessiveDoseAlerts(dto: QueryExcessiveDoseAlertsDto, organizationId: string) {
    return this.getExcessiveDoseAlertsUseCase.execute(dto, organizationId);
  }
}
