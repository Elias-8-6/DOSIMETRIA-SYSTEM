import { SetMetadata } from '@nestjs/common';
import { Role } from '@common/interfaces/jwt-payload.interface';

export const ROLES_KEY = 'roles';

/**
 * Decorador @Roles() — define qué roles pueden acceder a un endpoint.
 *
 * Uso:
 *   @Roles(Role.ADMIN_LAB, Role.TECNICO_LAB)
 *   @Get('dosimeters')
 *   findAll() { ... }
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
