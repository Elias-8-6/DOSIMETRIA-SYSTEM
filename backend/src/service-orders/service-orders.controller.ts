import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ServiceOrdersService } from './service-orders.service';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { UpdateServiceOrderDto } from './dto/update-service-order.dto';
import { UpdateServiceOrderStatusDto } from './dto/update-service-order-status.dto';
import { CreateServiceOrderItemDto } from './dto/create-service-order-item.dto';
import { QueryServiceOrdersDto } from './dto/query-service-orders.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { CheckPermission } from '@common/decorators/check-permission.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@common/interfaces/jwt-payload.interface';

@Controller('service-orders')
@UseGuards(JwtGuard, PermissionsGuard)
export class ServiceOrdersController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) {}

  @Get()
  @CheckPermission('service_orders', 'read')
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryServiceOrdersDto) {
    return this.serviceOrdersService.findAll(
      user.organization_id,
      query.search,
      query.status,
      query.service_type,
      query.priority,
      query.client_id,
      query.page ? parseInt(query.page) : 1,
      query.limit ? parseInt(query.limit) : 10,
    );
  }

  @Get(':id')
  @CheckPermission('service_orders', 'read')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.serviceOrdersService.findOne(id, user.organization_id);
  }

  @Post()
  @CheckPermission('service_orders', 'create')
  create(@Body() dto: CreateServiceOrderDto, @CurrentUser() user: JwtPayload) {
    return this.serviceOrdersService.create(dto, user.organization_id, user.sub);
  }

  @Patch(':id')
  @CheckPermission('service_orders', 'update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceOrderDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.serviceOrdersService.update(id, dto, user.organization_id, user.sub);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @CheckPermission('service_orders', 'update')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceOrderStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.serviceOrdersService.updateStatus(id, dto, user.organization_id, user.sub);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @CheckPermission('service_orders', 'delete')
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.serviceOrdersService.cancel(id, user.organization_id, user.sub);
  }

  @Post(':id/items')
  @CheckPermission('service_orders', 'update')
  addItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateServiceOrderItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.serviceOrdersService.addItem(id, dto, user.organization_id, user.sub);
  }

  @Delete(':id/items/:itemId')
  @CheckPermission('service_orders', 'update')
  removeItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.serviceOrdersService.removeItem(id, itemId, user.organization_id, user.sub);
  }
}
