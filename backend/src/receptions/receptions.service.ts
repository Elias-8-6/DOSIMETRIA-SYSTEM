import 'multer';
import { Injectable } from '@nestjs/common';
import { CreateReceptionDto } from './dto/create-reception.dto';
import { UpdateReceptionDto } from './dto/update-reception.dto';
import { CreateReceptionUseCase } from './use-cases/create-reception.use-case';
import { FindAllReceptionsUseCase } from './use-cases/find-all-receptions.use-case';
import { FindOneReceptionUseCase } from './use-cases/find-one-reception.use-case';
import { GetPendingOrdersForReceptionUseCase } from './use-cases/get-pending-orders-for-reception.use-case';
import { UpdateReceptionUseCase } from './use-cases/update-reception.use-case';
import { UploadReceptionPhotoUseCase } from './use-cases/upload-reception-photo.use-case';

@Injectable()
export class ReceptionsService {
  constructor(
    private readonly createReceptionUseCase: CreateReceptionUseCase,
    private readonly findAllReceptionsUseCase: FindAllReceptionsUseCase,
    private readonly findOneReceptionUseCase: FindOneReceptionUseCase,
    private readonly getPendingOrdersForReceptionUseCase: GetPendingOrdersForReceptionUseCase,
    private readonly updateReceptionUseCase: UpdateReceptionUseCase,
    private readonly uploadReceptionPhotoUseCase: UploadReceptionPhotoUseCase,
  ) {}

  findAll(
    organizationId: string,
    search?: string,
    packagingCondition?: string,
    serviceOrderId?: string,
    clientId?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    return this.findAllReceptionsUseCase.execute(
      organizationId,
      search,
      packagingCondition,
      serviceOrderId,
      clientId,
      page,
      limit,
    );
  }

  findOne(receptionId: string, organizationId: string) {
    return this.findOneReceptionUseCase.execute(receptionId, organizationId);
  }

  getPendingOrders(organizationId: string, search?: string) {
    return this.getPendingOrdersForReceptionUseCase.execute(organizationId, search);
  }

  create(dto: CreateReceptionDto, organizationId: string, requestingUserId: string) {
    return this.createReceptionUseCase.execute(dto, organizationId, requestingUserId);
  }

  update(
    receptionId: string,
    dto: UpdateReceptionDto,
    organizationId: string,
    requestingUserId: string,
  ) {
    return this.updateReceptionUseCase.execute(
      receptionId,
      dto,
      organizationId,
      requestingUserId,
    );
  }

  uploadPhoto(file: Express.Multer.File, organizationId: string) {
    return this.uploadReceptionPhotoUseCase.execute(file, organizationId);
  }
}
