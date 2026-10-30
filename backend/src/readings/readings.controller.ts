import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ReadingsService } from './readings.service';
import { IngestReadingsBatchDto } from './dto/ingest-readings.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { CheckPermission } from '@common/decorators/check-permission.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { Role } from '@common/interfaces/jwt-payload.interface';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@common/interfaces/jwt-payload.interface';

@Controller('readings')
@UseGuards(JwtGuard, PermissionsGuard, RolesGuard)
export class ReadingsController {
  constructor(private readonly readingsService: ReadingsService) {}

  @Post('ingest')
  @CheckPermission('readings', 'create')
  @Roles(
    Role.ADMIN_LAB,
    Role.TECNICO_LAB,
    Role.OFICIAL_PROTECCION_RADIOLOGICA,
  )
  ingest(@Body() dto: IngestReadingsBatchDto, @CurrentUser() user: JwtPayload) {
    return this.readingsService.ingest(dto, user.sub);
  }

  @Get('dosimeter/:id')
  @CheckPermission('readings', 'read')
  findByDosimeter(@Param('id', ParseUUIDPipe) id: string) {
    return this.readingsService.findByDosimeter(id);
  }

  @Get('worker/:id')
  @CheckPermission('readings', 'read')
  findByWorker(@Param('id', ParseUUIDPipe) id: string) {
    return this.readingsService.findByWorker(id);
  }
}
