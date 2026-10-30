import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { GenerateMonthlyReportDto } from './dto/generate-monthly-report.dto';
import { GenerateWorkerHistoryDto } from './dto/generate-worker-history.dto';
import { GenerateExcessiveDoseReportDto } from './dto/generate-excessive-dose-report.dto';
import { QueryReportsDto } from './dto/query-reports.dto';
import { QueryExcessiveDoseAlertsDto } from './dto/query-excessive-dose-alerts.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('reports')
@UseGuards(RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Alertas críticas de dosis excesiva (> 2.0 mSv)
   */
  @Get('alerts/excessive-dose')
  @Roles(
    Role.ADMIN_LAB,
    Role.OFICIAL_PROTECCION_RADIOLOGICA,
    Role.ENCARGADO_PROTECCION_RADIOLOGICA,
  )
  getExcessiveDoseAlerts(
    @Query() query: QueryExcessiveDoseAlertsDto,
    @CurrentUser('organization_id') orgId: string,
  ) {
    return this.reportsService.getExcessiveDoseAlerts(query, orgId);
  }

  /**
   * Generar y emitir Informe Mensual por Cliente con correlativo e integridad SHA-256
   */
  @Post('monthly')
  @Roles(Role.ADMIN_LAB, Role.OFICIAL_PROTECCION_RADIOLOGICA)
  generateMonthlyReport(
    @Body() dto: GenerateMonthlyReportDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('organization_id') orgId: string,
  ) {
    return this.reportsService.generateMonthlyReport(dto, userId, orgId);
  }

  /**
   * Historial dosimétrico acumulado de vida laboral del POE (retención 50-75 años)
   */
  @Get('worker/:workerId/history')
  @Roles(
    Role.ADMIN_LAB,
    Role.OFICIAL_PROTECCION_RADIOLOGICA,
    Role.ENCARGADO_PROTECCION_RADIOLOGICA,
    Role.AUDITOR,
  )
  getWorkerHistory(
    @Param('workerId', ParseUUIDPipe) workerId: string,
    @Query() query: GenerateWorkerHistoryDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('organization_id') orgId: string,
  ) {
    query.worker_id = workerId;
    return this.reportsService.generateWorkerHistory(query, userId, orgId);
  }

  /**
   * Generar Informe Técnico Urgente Minsa ante lectura crítica (> 2.0 mSv)
   */
  @Post('urgent-excessive-dose')
  @Roles(Role.ADMIN_LAB, Role.OFICIAL_PROTECCION_RADIOLOGICA)
  generateUrgentExcessiveDoseReport(
    @Body() dto: GenerateExcessiveDoseReportDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('organization_id') orgId: string,
  ) {
    return this.reportsService.generateUrgentExcessiveDoseReport(dto, userId, orgId);
  }

  /**
   * Consulta de informes oficiales emitidos
   */
  @Get()
  @Roles(
    Role.ADMIN_LAB,
    Role.OFICIAL_PROTECCION_RADIOLOGICA,
    Role.ENCARGADO_PROTECCION_RADIOLOGICA,
    Role.AUDITOR,
  )
  findReports(
    @Query() query: QueryReportsDto,
    @CurrentUser('organization_id') orgId: string,
  ) {
    return this.reportsService.findOfficialReports(query, orgId);
  }

  /**
   * Obtener detalle de informe y verificar sello criptográfico SHA-256
   */
  @Get(':id')
  @Roles(
    Role.ADMIN_LAB,
    Role.OFICIAL_PROTECCION_RADIOLOGICA,
    Role.ENCARGADO_PROTECCION_RADIOLOGICA,
    Role.AUDITOR,
  )
  getReportById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organization_id') orgId: string,
  ) {
    return this.reportsService.getReportById(id, orgId);
  }
}
