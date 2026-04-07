import { SetMetadata } from '@nestjs/common';

export const CHECK_PERMISSION_KEY = 'check_permission';

/**
 * Tipo que representa un permiso requerido.
 * module: el módulo del sistema ('dosimeters', 'clients', etc.)
 * action: la acción CRUD ('create', 'read', 'update', 'delete')
 */
export interface RequiredPermission {
  module: string;
  action: 'create' | 'read' | 'update' | 'delete';
}

/**
 * Decorador @CheckPermission() — define qué permiso granular
 * se necesita para acceder a un endpoint.
 *
 * Uso:
 *   @CheckPermission('dosimeters', 'create')
 *   @Post()
 *   createDosimeter() { ... }
 *
 *   @CheckPermission('clients', 'read')
 *   @Get()
 *   findAll() { ... }
 *
 * NestJS construye el código como 'modulo:accion' y lo busca
 * en la tabla user_permissions del usuario autenticado.
 */
export const CheckPermission = (
  module: string,
  action: 'create' | 'read' | 'update' | 'delete',
) =>
  SetMetadata(CHECK_PERMISSION_KEY, { module, action } as RequiredPermission);
