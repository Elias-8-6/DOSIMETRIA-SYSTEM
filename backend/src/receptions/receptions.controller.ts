import 'multer';
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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReceptionsService } from './receptions.service';
import { CreateReceptionDto } from './dto/create-reception.dto';
import { UpdateReceptionDto } from './dto/update-reception.dto';
import { QueryReceptionsDto } from './dto/query-receptions.dto';
import { CreateSurveyMeterDto } from './dto/create-survey-meter.dto';
import { QuerySurveyMetersDto } from './dto/query-survey-meters.dto';
import { ProcessTriageScanDto } from './dto/process-triage-scan.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { CheckPermission } from '@common/decorators/check-permission.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { Role } from '@common/interfaces/jwt-payload.interface';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@common/interfaces/jwt-payload.interface';

@Controller('receptions')
@UseGuards(JwtGuard, PermissionsGuard, RolesGuard)
export class ReceptionsController {
  constructor(private readonly receptionsService: ReceptionsService) {}

  // ------------------------------------------------------------
  // Detectores de Radiación (Metrología e ISO 17025)
  // ------------------------------------------------------------
  @Get('survey-meters')
  @CheckPermission('receptions', 'read')
  findSurveyMeters(@Query() query: QuerySurveyMetersDto) {
    return this.receptionsService.findSurveyMeters(query);
  }

  @Post('survey-meters')
  @CheckPermission('receptions', 'create')
  @Roles(Role.ADMIN_LAB, Role.OFICIAL_PROTECCION_RADIOLOGICA, Role.ENCARGADO_PROTECCION_RADIOLOGICA)
  createSurveyMeter(@Body() dto: CreateSurveyMeterDto, @CurrentUser() user: JwtPayload) {
    return this.receptionsService.createSurveyMeter(dto, user.sub);
  }

  // ------------------------------------------------------------
  // Triaje Masivo por Código de Barras USB y Control de Contaminación
  // ------------------------------------------------------------
  @Post(':id/triage/scan')
  @CheckPermission('receptions', 'create')
  processTriageScan(
    @Param('id', ParseUUIDPipe) receptionId: string,
    @Body() dto: ProcessTriageScanDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.receptionsService.processTriageScan(receptionId, dto, user.sub);
  }

  @Get('triage/quarantine')
  @CheckPermission('receptions', 'read')
  listQuarantined() {
    return this.receptionsService.listQuarantined();
  }

  @Patch('triage/quarantine/:itemId/release')
  @CheckPermission('receptions', 'update')
  @Roles(Role.ADMIN_LAB, Role.OFICIAL_PROTECCION_RADIOLOGICA)
  releaseFromQuarantine(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.receptionsService.releaseFromQuarantine(itemId, user.sub);
  }

  // ------------------------------------------------------------
  // Operaciones Estándar de Recepción
  // ------------------------------------------------------------
  @Get()
  @CheckPermission('receptions', 'read')
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryReceptionsDto) {
    return this.receptionsService.findAll(
      user.organization_id,
      query.search,
      query.packaging_condition,
      query.service_order_id,
      query.client_id,
      query.page ? parseInt(query.page) : 1,
      query.limit ? parseInt(query.limit) : 10,
    );
  }

  @Get('pending-orders')
  @CheckPermission('receptions', 'read')
  getPendingOrders(@CurrentUser() user: JwtPayload, @Query('search') search?: string) {
    return this.receptionsService.getPendingOrders(user.organization_id, search);
  }

  @Get(':id')
  @CheckPermission('receptions', 'read')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.receptionsService.findOne(id, user.organization_id);
  }

  @Post()
  @CheckPermission('receptions', 'create')
  create(@Body() dto: CreateReceptionDto, @CurrentUser() user: JwtPayload) {
    return this.receptionsService.create(dto, user.organization_id, user.sub);
  }

  @Patch(':id')
  @CheckPermission('receptions', 'update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReceptionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.receptionsService.update(id, dto, user.organization_id, user.sub);
  }

  @Post('upload-photo')
  @UseInterceptors(FileInterceptor('photo'))
  @CheckPermission('receptions', 'create')
  uploadPhoto(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: JwtPayload) {
    return this.receptionsService.uploadPhoto(file, user.organization_id);
  }
}
