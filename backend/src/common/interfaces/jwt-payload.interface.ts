/**
 * Estructura del payload JWT.
 * NestJS lo genera en AuthService.login() y lo valida en JwtStrategy.
 * El active_role es el rol con el que el usuario opera en esta sesión.
 * ISO 17025: audit_logs registra active_role en cada acción.
 */
export interface JwtPayload {
  sub: string;           // user_id (uuid)
  email: string;
  full_name: string;
  organization_id: string;
  active_role: string;   // código del rol activo: 'admin_lab', 'tecnico_lab', etc.
  iat?: number;
  exp?: number;
}

/**
 * Roles disponibles en el sistema.
 * Deben coincidir exactamente con los códigos en la tabla roles (migración 001).
 */
export enum Role {
  ADMIN_LAB           = 'admin_lab',
  TECNICO_LAB         = 'tecnico_lab',
  COORDINADOR_CLIENTE = 'coordinador_cliente',
  AUDITOR             = 'auditor',
}
