import { IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from '@common/interfaces/jwt-payload.interface';

/**
 * DTO para seleccionar el rol activo de la sesión.
 *
 * Flujo:
 * 1. Usuario hace login → recibe token temporal sin active_role
 * 2. Si tiene un solo rol, NestJS lo selecciona automáticamente
 * 3. Si tiene múltiples roles, el frontend muestra selector
 * 4. Usuario selecciona rol → POST /auth/select-role → nuevo JWT con active_role
 *
 * ISO 17025: cada acción en audit_logs registra el active_role
 * con que fue ejecutada, no solo el user_id.
 */
export class SelectRoleDto {
  @IsNotEmpty({ message: 'El rol es requerido' })
  @IsEnum(Role, { message: 'El rol seleccionado no es válido' })
  role: Role;
}
