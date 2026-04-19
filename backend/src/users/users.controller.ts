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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { AssignPermissionDto } from './dto/assign-permission.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { CheckPermission } from '@common/decorators/check-permission.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@common/interfaces/jwt-payload.interface';
import {QueryUsersDto} from "./dto/query-users.dto";

/**
 * UsersController
 *
 * Todos los endpoints requieren JWT válido + permiso granular.
 * @UseGuards a nivel de clase aplica JwtGuard y PermissionsGuard
 * a todos los métodos — no hay que repetirlo en cada uno.
 *
 * El organization_id y el user_id del admin nunca vienen del body —
 * siempre se extraen del JWT con @CurrentUser().
 */
@Controller()
@UseGuards(JwtGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  //Catálogo de permisos

  /**
   * GET /permissions
   * Lista todos los permisos disponibles en el sistema.
   * El admin lo usa para saber qué puede asignar a un usuario.
   */
  @Get('permissions')
  @CheckPermission('users', 'read')
  findAllPermissions() {
    return this.usersService.findAllPermissions();
  }

  // ── Usuarios ─────────────────────────────────────────────────────────

  /**
   * GET /users
   * Lista todos los usuarios de la organización del admin autenticado.
   */
  @Get('users')
  @CheckPermission('users', 'read')
  findAll(
      @CurrentUser() user: JwtPayload,
      @Query() query: QueryUsersDto,
  ) {
    return this.usersService.findAll(user.organization_id, query.search, query.status);
  }

  /**
   * GET /users/:id
   * Detalle de un usuario con sus roles y permisos activos.
   * ParseUUIDPipe valida que el :id sea un UUID válido antes
   * de llegar al service — retorna 400 si no lo es.
   */
  @Get('users/:id')
  @CheckPermission('users', 'read')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.findOne(id, user.organization_id);
  }

  /**
   * POST /users
   * Crea un nuevo usuario en la organización del admin.
   * Retorna 201 Created por defecto en POST.
   */
  @Post('users')
  @CheckPermission('users', 'create')
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.create(dto, user.organization_id, user.sub);
  }

  /**
   * PATCH /users/:id
   * Actualiza full_name y/o email de un usuario.
   */
  @Patch('users/:id')
  @CheckPermission('users', 'update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.update(id, dto, user.organization_id, user.sub);
  }

  /**
   * PATCH /users/:id/status
   * Activa o desactiva un usuario.
   * Endpoint separado de PATCH /users/:id porque es una operación
   * semánticamente distinta — cambio de estado vs edición de datos.
   */
  @Patch('users/:id/status')
  @CheckPermission('users', 'update')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.updateStatus(
      id,
      dto,
      user.organization_id,
      user.sub,
    );
  }

  //Permisos de usuario

  /**
   * POST /users/:id/permissions
   * Asigna un permiso a un usuario específico.
   */
  @Post('users/:id/permissions')
  @CheckPermission('users', 'update')
  assignPermission(
    @Param('id') id: string,
    @Body() dto: AssignPermissionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.assignPermission(
      id,
      dto,
      user.organization_id,
      user.sub,
    );
  }

  /**
   * DELETE /users/:id/permissions/:permissionId
   * Revoca un permiso de un usuario.
   * El permiso no se elimina — se marca como granted = false
   * para mantener la trazabilidad ISO 17025.
   */
  @Delete('users/:id/permissions/:permissionId')
  @HttpCode(HttpStatus.OK)
  @CheckPermission('users', 'update')
  revokePermission(
    @Param('id') id: string,
    @Param('permissionId', ParseUUIDPipe) permissionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.revokePermission(
      id,
      permissionId,
      user.organization_id,
      user.sub,
    );
  }
}
