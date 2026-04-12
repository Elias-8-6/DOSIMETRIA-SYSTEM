import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { FindAllUsersUseCase } from './use-cases/find-all-users.use-case';
import { FindOneUserUseCase } from './use-cases/find-one-user.use-case';
import { CreateUserUseCase } from './use-cases/create-user.use-case';
import { UpdateUserUseCase } from './use-cases/update-user.use-case';
import { DeactivateUserUseCase } from './use-cases/deactivate-user.use-case';
import { AssignPermissionUseCase } from './use-cases/assign-permission.use-case';
import { RevokePermissionUseCase } from './use-cases/revoke-permission.use-case';

/**
 * UsersModule
 *
 * SupabaseService no se declara aquí porque viene del
 * SupabaseModule global registrado en AppModule.
 *
 * Rutas expuestas:
 *   GET    /api/v1/permissions
 *   GET    /api/v1/users
 *   GET    /api/v1/users/:id
 *   POST   /api/v1/users
 *   PATCH  /api/v1/users/:id
 *   PATCH  /api/v1/users/:id/status
 *   POST   /api/v1/users/:id/permissions
 *   DELETE /api/v1/users/:id/permissions/:permissionId
 */
@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    FindAllUsersUseCase,
    FindOneUserUseCase,
    CreateUserUseCase,
    UpdateUserUseCase,
    DeactivateUserUseCase,
    AssignPermissionUseCase,
    RevokePermissionUseCase,
  ],
})
export class UsersModule {}
