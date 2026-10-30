import 'multer';
import { Injectable } from '@nestjs/common';
import { CreateDosimeterDto } from './dto/create-dosimeter.dto';
import { UpdateDosimeterDto } from './dto/update-dosimeter.dto';
import { UpdateDosimeterStatusDto } from './dto/update-dosimeter-status.dto';
import { AssignDosimeterDto } from './dto/assign-dosimeter.dto';
import { ReturnDosimeterDto } from './dto/return-dosimeter.dto';
import { CreateHolderDto } from './dto/create-holder.dto';
import { CreateTldCardDto } from './dto/create-tld-card.dto';
import { AssembleDosimeterDto } from './dto/assemble-dosimeter.dto';
import { DisassembleDosimeterDto } from './dto/disassemble-dosimeter.dto';
import { QueryHoldersDto } from './dto/query-holders.dto';
import { QueryTldCardsDto } from './dto/query-tld-cards.dto';
import { FindAllDosimetersUseCase } from './use-cases/find-all-dosimeters.use-case';
import { FindOneDosimeterUseCase } from './use-cases/find-one-dosimeter.use-case';
import { CreateDosimeterUseCase } from './use-cases/create-dosimeter.use-case';
import { UpdateDosimeterUseCase } from './use-cases/update-dosimeter.use-case';
import { UpdateDosimeterStatusUseCase } from './use-cases/update-dosimeter-status.use-case';
import { AssignDosimeterUseCase } from './use-cases/assign-dosimeter.use-case';
import { ReturnDosimeterUseCase } from './use-cases/return-dosimeter.use-case';
import { GetDosimeterHistoryUseCase } from './use-cases/get-dosimeter-history.use-case';
import { UploadDosimeterPhotoUseCase } from './use-cases/upload-dosimeter-photo.use-case';
import { CreateHolderUseCase } from './use-cases/create-holder.use-case';
import { CreateTldCardUseCase } from './use-cases/create-tld-card.use-case';
import { AssembleDosimeterUseCase } from './use-cases/assemble-dosimeter.use-case';
import { DisassembleDosimeterUseCase } from './use-cases/disassemble-dosimeter.use-case';
import { FindHoldersUseCase } from './use-cases/find-holders.use-case';
import { FindTldCardsUseCase } from './use-cases/find-tld-cards.use-case';

@Injectable()
export class DosimetersService {
  constructor(
    private readonly findAllDosimetersUseCase: FindAllDosimetersUseCase,
    private readonly findOneDosimeterUseCase: FindOneDosimeterUseCase,
    private readonly createDosimeterUseCase: CreateDosimeterUseCase,
    private readonly updateDosimeterUseCase: UpdateDosimeterUseCase,
    private readonly updateDosimeterStatusUseCase: UpdateDosimeterStatusUseCase,
    private readonly assignDosimeterUseCase: AssignDosimeterUseCase,
    private readonly returnDosimeterUseCase: ReturnDosimeterUseCase,
    private readonly getDosimeterHistoryUseCase: GetDosimeterHistoryUseCase,
    private readonly uploadDosimeterPhotoUseCase: UploadDosimeterPhotoUseCase,
    private readonly createHolderUseCase: CreateHolderUseCase,
    private readonly createTldCardUseCase: CreateTldCardUseCase,
    private readonly assembleDosimeterUseCase: AssembleDosimeterUseCase,
    private readonly disassembleDosimeterUseCase: DisassembleDosimeterUseCase,
    private readonly findHoldersUseCase: FindHoldersUseCase,
    private readonly findTldCardsUseCase: FindTldCardsUseCase,
  ) {}

  findAll(
    organizationId: string,
    search?: string,
    dosimeterTypeId?: string,
    statusCode?: string,
    currentCondition?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    return this.findAllDosimetersUseCase.execute(
      organizationId,
      search,
      dosimeterTypeId,
      statusCode,
      currentCondition,
      page,
      limit,
    );
  }

  findOne(dosimeterId: string, organizationId: string) {
    return this.findOneDosimeterUseCase.execute(dosimeterId, organizationId);
  }

  getHistory(dosimeterId: string, organizationId: string) {
    return this.getDosimeterHistoryUseCase.execute(dosimeterId, organizationId);
  }

  create(dto: CreateDosimeterDto, organizationId: string, requestingUserId: string) {
    return this.createDosimeterUseCase.execute(dto, organizationId, requestingUserId);
  }

  update(
    dosimeterId: string,
    dto: UpdateDosimeterDto,
    organizationId: string,
    requestingUserId: string,
  ) {
    return this.updateDosimeterUseCase.execute(dosimeterId, dto, organizationId, requestingUserId);
  }

  updateStatus(
    dosimeterId: string,
    dto: UpdateDosimeterStatusDto,
    organizationId: string,
    requestingUserId: string,
  ) {
    return this.updateDosimeterStatusUseCase.execute(
      dosimeterId,
      dto,
      organizationId,
      requestingUserId,
    );
  }

  assign(
    dosimeterId: string,
    dto: AssignDosimeterDto,
    organizationId: string,
    requestingUserId: string,
  ) {
    return this.assignDosimeterUseCase.execute(dosimeterId, dto, organizationId, requestingUserId);
  }

  return(
    dosimeterId: string,
    dto: ReturnDosimeterDto,
    organizationId: string,
    requestingUserId: string,
  ) {
    return this.returnDosimeterUseCase.execute(dosimeterId, dto, organizationId, requestingUserId);
  }

  uploadPhoto(dosimeterId: string, file: Express.Multer.File, organizationId: string) {
    return this.uploadDosimeterPhotoUseCase.execute(file, organizationId, dosimeterId);
  }

  // Métodos del Modelado Físico 1:1 (Portadosímetro / Tarjeta TLD)
  createHolder(dto: CreateHolderDto, requestingUserId: string) {
    return this.createHolderUseCase.execute(dto, requestingUserId);
  }

  findHolders(query: QueryHoldersDto) {
    return this.findHoldersUseCase.findAll(query);
  }

  findHolderByBarcode(barcode: string) {
    return this.findHoldersUseCase.findByBarcode(barcode);
  }

  createTldCard(dto: CreateTldCardDto, requestingUserId: string) {
    return this.createTldCardUseCase.execute(dto, requestingUserId);
  }

  findTldCards(query: QueryTldCardsDto) {
    return this.findTldCardsUseCase.execute(query);
  }

  assemble(dto: AssembleDosimeterDto, requestingUserId: string) {
    return this.assembleDosimeterUseCase.execute(dto, requestingUserId);
  }

  disassemble(dto: DisassembleDosimeterDto, requestingUserId: string) {
    return this.disassembleDosimeterUseCase.execute(dto, requestingUserId);
  }
}
