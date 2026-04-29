import { Injectable } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { AssignPermissionDto } from './dto/assign-permission.dto';
import { FindAllUsersUseCase } from './use-cases/find-all-users.use-case';
import { FindOneUserUseCase } from './use-cases/find-one-user.use-case';
import { CreateUserUseCase } from './use-cases/create-user.use-case';
import { UpdateUserUseCase } from './use-cases/update-user.use-case';
import { DeactivateUserUseCase } from './use-cases/deactivate-user.use-case';
import { AssignPermissionUseCase } from './use-cases/assign-permission.use-case';
import { RevokePermissionUseCase } from './use-cases/revoke-permission.use-case';

/**
 * UsersService — coordinador de use-cases.
 *
 * No contiene lógica de negocio — delega cada operación
 * al use-case correspondiente y retorna el resultado.
 *
 * También expone findAllPermissions() directamente porque
 * es una consulta simple al catálogo sin lógica de negocio.
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly findAllUsersUseCase: FindAllUsersUseCase,
    private readonly findOneUserUseCase: FindOneUserUseCase,
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deactivateUserUseCase: DeactivateUserUseCase,
    private readonly assignPermissionUseCase: AssignPermissionUseCase,
    private readonly revokePermissionUseCase: RevokePermissionUseCase,
  ) {}

  // Consultas
  findAll(organizationId: string, search?: string, status?: string) {
    return this.findAllUsersUseCase.execute(organizationId, search, status);
  }

  findOne(userId: string, organizationId: string) {
    return this.findOneUserUseCase.execute(userId, organizationId);
  }

  /**
   * findAllPermissions()
   * Retorna el catálogo completo de permisos del sistema.
   * El admin lo usa para saber qué permisos puede asignar.
   * No necesita use-case propio — es una consulta directa al catálogo.
   */
  async findAllPermissions() {
    const { data, error } = await this.supabase
      .getClient()
      .from('permissions')
      .select('id, code, module, action, description')
      .order('module', { ascending: true })
      .order('action', { ascending: true });

    if (error) {
      throw new Error('No se pudo obtener el catálogo de permisos');
    }

    return data ?? [];
  }

  // ── Mutaciones ───────────────────────────────────────────────────────

  create(dto: CreateUserDto, organizationId: string, grantedBy: string) {
    return this.createUserUseCase.execute(dto, organizationId, grantedBy);
  }

  update(userId: string, dto: UpdateUserDto, organizationId: string, requestingUserId: string) {
    return this.updateUserUseCase.execute(userId, dto, organizationId, requestingUserId);
  }

  updateStatus(
    userId: string,
    dto: UpdateUserStatusDto,
    organizationId: string,
    requestingUserId: string,
  ) {
    return this.deactivateUserUseCase.execute(userId, dto, organizationId, requestingUserId);
  }

  assignPermission(
    userId: string,
    dto: AssignPermissionDto,
    organizationId: string,
    grantedBy: string,
  ) {
    return this.assignPermissionUseCase.execute(userId, dto, organizationId, grantedBy);
  }

  revokePermission(
    userId: string,
    permissionId: string,
    organizationId: string,
    revokedBy: string,
  ) {
    return this.revokePermissionUseCase.execute(userId, permissionId, organizationId, revokedBy);
  }
}
