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
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { UpdateClientStatusDto } from './dto/update-client-status.dto';
import { CreateClientLocationDto } from './dto/create-client-location.dto';
import { QueryClientsDto } from './dto/query-clients.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { CheckPermission } from '@common/decorators/check-permission.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@common/interfaces/jwt-payload.interface';


@Controller('clients')
@UseGuards(JwtGuard, PermissionsGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}


  @Get()
  @CheckPermission('clients', 'read')
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryClientsDto) {
    return this.clientsService.findAll(
      user.organization_id,
      query.search,
      query.status,
      query.client_type,
    );
  }


  @Get(':id')
  @CheckPermission('clients', 'read')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.clientsService.findOne(id, user.organization_id);
  }


  @Post()
  @CheckPermission('clients', 'create')
  create(@Body() dto: CreateClientDto, @CurrentUser() user: JwtPayload) {
    return this.clientsService.create(dto, user.organization_id, user.sub);
  }


  @Patch(':id')
  @CheckPermission('clients', 'update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.clientsService.update(id, dto, user.organization_id, user.sub);
  }


  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @CheckPermission('clients', 'update')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.clientsService.updateStatus(id, dto, user.organization_id, user.sub);
  }


  @Post(':id/locations')
  @CheckPermission('clients', 'update')
  createLocation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateClientLocationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.clientsService.createLocation(id, dto, user.organization_id);
  }

  @Patch(':id/locations/:locationId')
  @CheckPermission('clients', 'update')
  updateLocation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Body() dto: CreateClientLocationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.clientsService.updateLocation(id, locationId, dto, user.organization_id);
  }


  @Patch(':id/locations/:locationId/status')
  @HttpCode(HttpStatus.OK)
  @CheckPermission('clients', 'update')
  updateLocationStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Body() dto: UpdateClientStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.clientsService.updateLocationStatus(
      id,
      locationId,
      dto.status,
      user.organization_id,
    );
  }
}
