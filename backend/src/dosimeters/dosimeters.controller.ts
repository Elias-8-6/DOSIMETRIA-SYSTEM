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
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DosimetersService } from './dosimeters.service';
import { CreateDosimeterDto } from './dto/create-dosimeter.dto';
import { UpdateDosimeterDto } from './dto/update-dosimeter.dto';
import { UpdateDosimeterStatusDto } from './dto/update-dosimeter-status.dto';
import { AssignDosimeterDto } from './dto/assign-dosimeter.dto';
import { ReturnDosimeterDto } from './dto/return-dosimeter.dto';
import { QueryDosimetersDto } from './dto/query-dosimeters.dto';
import { CreateHolderDto } from './dto/create-holder.dto';
import { CreateTldCardDto } from './dto/create-tld-card.dto';
import { AssembleDosimeterDto } from './dto/assemble-dosimeter.dto';
import { DisassembleDosimeterDto } from './dto/disassemble-dosimeter.dto';
import { QueryHoldersDto } from './dto/query-holders.dto';
import { QueryTldCardsDto } from './dto/query-tld-cards.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { CheckPermission } from '@common/decorators/check-permission.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@common/interfaces/jwt-payload.interface';

@Controller('dosimeters')
@UseGuards(JwtGuard, PermissionsGuard, RolesGuard)
export class DosimetersController {
  constructor(private readonly dosimetersService: DosimetersService) {}

  // ------------------------------------------------------------
  // Endpoints de Portadosímetros (Chasis Exterior con Código de Barras USB)
  // ------------------------------------------------------------
  @Get('holders')
  @CheckPermission('dosimeters', 'read')
  findHolders(@Query() query: QueryHoldersDto) {
    return this.dosimetersService.findHolders(query);
  }

  @Get('holders/barcode/:barcode')
  @CheckPermission('dosimeters', 'read')
  findHolderByBarcode(@Param('barcode') barcode: string) {
    return this.dosimetersService.findHolderByBarcode(barcode);
  }

  @Post('holders')
  @CheckPermission('dosimeters', 'create')
  createHolder(@Body() dto: CreateHolderDto, @CurrentUser() user: JwtPayload) {
    return this.dosimetersService.createHolder(dto, user.sub);
  }

  // ------------------------------------------------------------
  // Endpoints de Tarjetas TLD Internas (2 o 4 Pastillas)
  // ------------------------------------------------------------
  @Get('tld-cards')
  @CheckPermission('dosimeters', 'read')
  findTldCards(@Query() query: QueryTldCardsDto) {
    return this.dosimetersService.findTldCards(query);
  }

  @Post('tld-cards')
  @CheckPermission('dosimeters', 'create')
  createTldCard(@Body() dto: CreateTldCardDto, @CurrentUser() user: JwtPayload) {
    return this.dosimetersService.createTldCard(dto, user.sub);
  }

  // ------------------------------------------------------------
  // Endpoints de Ensamble y Desensamble 1:1
  // ------------------------------------------------------------
  @Post('assemble')
  @CheckPermission('dosimeters', 'create')
  assemble(@Body() dto: AssembleDosimeterDto, @CurrentUser() user: JwtPayload) {
    return this.dosimetersService.assemble(dto, user.sub);
  }

  @Post('disassemble')
  @CheckPermission('dosimeters', 'update')
  disassemble(@Body() dto: DisassembleDosimeterDto, @CurrentUser() user: JwtPayload) {
    return this.dosimetersService.disassemble(dto, user.sub);
  }

  // ------------------------------------------------------------
  // Endpoints Tradicionales de Dosímetros (Compatibilidad hacia atrás)
  // ------------------------------------------------------------
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
  returnDosimeter(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReturnDosimeterDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.dosimetersService.return(id, dto, user.organization_id, user.sub);
  }

  @Post('upload-photo')
  @UseInterceptors(FileInterceptor('photo'))
  @CheckPermission('dosimeters', 'create')
  uploadPhotoGeneric(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.dosimetersService.uploadPhoto('temp-generic', file, user.organization_id);
  }

  @Post(':id/photo')
  @UseInterceptors(FileInterceptor('photo'))
  @CheckPermission('dosimeters', 'update')
  uploadPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.dosimetersService.uploadPhoto(id, file, user.organization_id);
  }
}
