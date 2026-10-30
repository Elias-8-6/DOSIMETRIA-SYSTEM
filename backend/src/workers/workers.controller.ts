import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WorkersService } from './workers.service';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { UpdateWorkerStatusDto } from './dto/update-worker-status.dto';
import { QueryWorkersDto } from './dto/query-workers.dto';
import { MedicalAlertQueryDto } from './dto/medical-alert-query.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { CheckPermission } from '@common/decorators/check-permission.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { Role } from '@common/interfaces/jwt-payload.interface';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@common/interfaces/jwt-payload.interface';

@Controller('workers')
@UseGuards(JwtGuard, PermissionsGuard, RolesGuard)
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Get()
  @CheckPermission('workers', 'read')
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryWorkersDto) {
    return this.workersService.findAll(
      user.organization_id,
      query.search,
      query.status,
      query.medical_status,
      query.client_id,
      query.client_location_id,
      query.page ? Number(query.page) : 1,
      query.limit ? Number(query.limit) : 10,
    );
  }

  @Get('alerts/medical')
  @CheckPermission('workers', 'read')
  @Roles(
    Role.ADMIN_LAB,
    Role.TECNICO_LAB,
    Role.OFICIAL_PROTECCION_RADIOLOGICA,
    Role.ENCARGADO_PROTECCION_RADIOLOGICA,
  )
  getMedicalAlerts(@CurrentUser() user: JwtPayload, @Query() query: MedicalAlertQueryDto) {
    const threshold = query.threshold_days ? Number(query.threshold_days) : 60;
    return this.workersService.getMedicalAlerts(user.organization_id, threshold, query.client_id);
  }

  @Get(':id')
  @CheckPermission('workers', 'read')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.workersService.findOne(id, user.organization_id);
  }

  @Post()
  @CheckPermission('workers', 'create')
  create(@Body() dto: CreateWorkerDto, @CurrentUser() user: JwtPayload) {
    return this.workersService.create(dto, user.organization_id, user.sub);
  }

  @Patch(':id')
  @CheckPermission('workers', 'update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkerDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.workersService.update(id, dto, user.organization_id, user.sub);
  }

  @Patch(':id/status')
  @CheckPermission('workers', 'update')
  @HttpCode(HttpStatus.OK)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkerStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.workersService.updateStatus(id, dto, user.organization_id, user.sub);
  }
}
