import 'multer';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReceptionsService } from './receptions.service';
import { CreateReceptionDto } from './dto/create-reception.dto';
import { QueryReceptionsDto } from './dto/query-receptions.dto';
import { UpdateReceptionDto } from './dto/update-reception.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { CheckPermission } from '@common/decorators/check-permission.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@common/interfaces/jwt-payload.interface';

@Controller('receptions')
@UseGuards(JwtGuard, PermissionsGuard)
export class ReceptionsController {
  constructor(private readonly receptionsService: ReceptionsService) {}

  @Get()
  @CheckPermission('receptions', 'read')
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryReceptionsDto) {
    return this.receptionsService.findAll(
      user.organization_id,
      query.search,
      query.packaging_condition,
      query.service_order_id,
      query.client_id,
      query.page ? parseInt(query.page, 10) : 1,
      query.limit ? parseInt(query.limit, 10) : 10,
    );
  }

  @Get('pending-orders')
  @CheckPermission('receptions', 'read')
  getPendingOrders(
    @CurrentUser() user: JwtPayload,
    @Query('search') search?: string,
  ) {
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
  @CheckPermission('receptions', 'create')
  @UseInterceptors(FileInterceptor('file'))
  uploadPhoto(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.receptionsService.uploadPhoto(file, user.organization_id);
  }
}
