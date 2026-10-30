import { SetMetadata } from '@nestjs/common';
import { Role } from '../interfaces/jwt-payload.interface';

export const ROLES_KEY = 'roles';

/**
 * Decorador @Roles — restringe el acceso a uno o más roles oficiales.
 * Se complementa con @CheckPermission para control granular.
 *
 * Ejemplo:
 *   @Roles(Role.OFICIAL_PROTECCION_RADIOLOGICA, Role.ENCARGADO_PROTECCION_RADIOLOGICA)
 */
export const Roles = (...roles: (Role | string)[]) => SetMetadata(ROLES_KEY, roles);
