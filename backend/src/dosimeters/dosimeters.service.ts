import { Injectable } from '@nestjs/common';
import { CreateDosimeterDto } from './dto/create-dosimeter.dto';
import { UpdateDosimeterDto } from './dto/update-dosimeter.dto';
import { UpdateDosimeterStatusDto } from './dto/update-dosimeter-status.dto';
import { AssignDosimeterDto } from './dto/assign-dosimeter.dto';
import { ReturnDosimeterDto } from './dto/return-dosimeter.dto';
import { FindAllDosimetersUseCase } from './use-cases/find-all-dosimeters.use-case';
import { FindOneDosimeterUseCase } from './use-cases/find-one-dosimeter.use-case';
import { CreateDosimeterUseCase } from './use-cases/create-dosimeter.use-case';
import { UpdateDosimeterUseCase } from './use-cases/update-dosimeter.use-case';
import { UpdateDosimeterStatusUseCase } from './use-cases/update-dosimeter-status.use-case';
import { AssignDosimeterUseCase } from './use-cases/assign-dosimeter.use-case';
import { ReturnDosimeterUseCase } from './use-cases/return-dosimeter.use-case';
import { GetDosimeterHistoryUseCase } from './use-cases/get-dosimeter-history.use-case';

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
}
