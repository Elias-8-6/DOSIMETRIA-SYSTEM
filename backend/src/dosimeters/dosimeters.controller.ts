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
import { DosimetersService } from './dosimeters.service';
import { CreateDosimeterDto } from './dto/create-dosimeter.dto';
import { UpdateDosimeterDto } from './dto/update-dosimeter.dto';
import { UpdateDosimeterStatusDto } from './dto/update-dosimeter-status.dto';
import { AssignDosimeterDto } from './dto/assign-dosimeter.dto';
import { ReturnDosimeterDto } from './dto/return-dosimeter.dto';
import { QueryDosimetersDto } from './dto/query-dosimeters.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { CheckPermission } from '@common/decorators/check-permission.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@common/interfaces/jwt-payload.interface';

@Controller('dosimeters')
@UseGuards(JwtGuard, PermissionsGuard)
export class DosimetersController {
  constructor(private readonly dosimetersService: DosimetersService) {}

  @Get()
  @CheckPermission('dosimeters', 'read')
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryDosimetersDto) {
    return this.dosimetersService.findAll(
      user.organization_id,
      query.search,
      query.dosimeter_type_id,
      query.status_code,
      query.current_condition,
      query.page ? parseInt(query.page) : 1,
      query.limit ? parseInt(query.limit) : 10,
    );
  }

  @Get(':id')
  @CheckPermission('dosimeters', 'read')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.dosimetersService.findOne(id, user.organization_id);
  }

  @Get(':id/history')
  @CheckPermission('assignments', 'read')
  getHistory(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.dosimetersService.getHistory(id, user.organization_id);
  }

  @Post()
  @CheckPermission('dosimeters', 'create')
  create(@Body() dto: CreateDosimeterDto, @CurrentUser() user: JwtPayload) {
    return this.dosimetersService.create(dto, user.organization_id, user.sub);
  }

  @Patch(':id')
  @CheckPermission('dosimeters', 'update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDosimeterDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.dosimetersService.update(id, dto, user.organization_id, user.sub);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @CheckPermission('dosimeters', 'update')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDosimeterStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.dosimetersService.updateStatus(id, dto, user.organization_id, user.sub);
  }

  @Post(':id/assign')
  @CheckPermission('assignments', 'create')
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignDosimeterDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.dosimetersService.assign(id, dto, user.organization_id, user.sub);
  }

  @Post(':id/return')
  @CheckPermission('assignments', 'update')
  return(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReturnDosimeterDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.dosimetersService.return(id, dto, user.organization_id, user.sub);
  }
}
