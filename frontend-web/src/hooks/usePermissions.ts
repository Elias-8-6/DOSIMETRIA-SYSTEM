import { useAuth } from './useAuth';

type PermissionModule =
  | 'users' | 'clients' | 'workers' | 'dosimeters' | 'assignments'
  | 'service_orders' | 'receptions' | 'lab_process' | 'readings'
  | 'reports' | 'equipment' | 'audit';

type PermissionAction = 'create' | 'read' | 'update' | 'delete';

/**
 * Hook para verificar si el usuario actual tiene un permiso específico.
 * Refleja exactamente la lógica del PermissionsGuard del backend:
 * busca en user_permissions donde granted = true y el código = 'module:action'
 */
export const usePermissions = () => {
  const { user } = useAuth();

  const can = (module: PermissionModule, action: PermissionAction): boolean => {
    if (!user?.permissions) return false;
    return user.permissions.some(
      (p) => p.module === module && p.action === action,
    );
  };

  const canAny = (module: PermissionModule, actions: PermissionAction[]): boolean => {
    return actions.some((action) => can(module, action));
  };

  return { can, canAny };
};
