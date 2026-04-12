/**
 * Estructura del payload JWT.
 * NestJS lo genera en AuthService.login() y lo valida en JwtStrategy.
 *
 * DISEÑO SIMPLIFICADO:
 * - Sin active_role — los permisos los controla PermissionsGuard
 *   consultando user_permissions en la base de datos.
 * - Los roles del usuario son solo informativos para la UI.
 *   Se cargan en /auth/profile si la UI los necesita mostrar.
 */
export interface JwtPayload {
  sub: string; // user_id (uuid)
  email: string;
  full_name: string;
  organization_id: string;
  iat?: number;
  exp?: number;
}

/**
 * Roles del sistema.
 * Solo son etiquetas informativas — no controlan acceso.
 * La autorización viene de user_permissions en la DB.
 */
export enum Role {
  ADMIN_LAB = "admin_lab",
  TECNICO_LAB = "tecnico_lab",
  COORDINADOR_CLIENTE = "coordinador_cliente",
  AUDITOR = "auditor",
}

/**
 * Módulos del sistema — usados en @CheckPermission()
 * Deben coincidir con permissions.module en la DB (migración 010).
 */
export enum PermissionModule {
  USERS = "users",
  CLIENTS = "clients",
  WORKERS = "workers",
  DOSIMETERS = "dosimeters",
  ASSIGNMENTS = "assignments",
  SERVICE_ORDERS = "service_orders",
  RECEPTIONS = "receptions",
  LAB_PROCESS = "lab_process",
  READINGS = "readings",
  REPORTS = "reports",
  EQUIPMENT = "equipment",
  AUDIT = "audit",
}

/**
 * Acciones CRUD disponibles — usadas en @CheckPermission()
 */
export enum PermissionAction {
  CREATE = "create",
  READ = "read",
  UPDATE = "update",
  DELETE = "delete",
}
