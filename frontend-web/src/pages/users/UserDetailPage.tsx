import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getUserById,
  getPermissions,
  assignPermission,
  revokePermission,
  updateUserStatus,
} from '../../api/users.api';
import type { UserDetail, Permission } from '../../api/users.api';
import { useAuth } from '../../hooks/useAuth';

/**
 * UserDetailPage — detalle de un usuario con gestión de permisos.
 */
export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [user, setUser] = useState<UserDetail | null>(null);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Cargar datos del usuario y catálogo de permisos
  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const [userData, permissionsData] = await Promise.all([getUserById(id), getPermissions()]);
        setUser(userData);
        setAllPermissions(permissionsData);
      } catch {
        setError('No se pudo cargar el usuario');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Verificar si el usuario tiene un permiso activo
  const userHasPermission = (permissionId: string): boolean => {
    return user?.permissions.some((p) => p.id === permissionId) ?? false;
  };

  // Asignar o revocar permiso
  const handleTogglePermission = async (permission: Permission) => {
    if (!id || !user) return;
    setActionLoading(permission.id);

    try {
      if (userHasPermission(permission.id)) {
        await revokePermission(id, permission.id);
      } else {
        await assignPermission(id, permission.id);
      }
      // Recargar el usuario para reflejar los cambios
      const updated = await getUserById(id);
      setUser(updated);
    } catch {
      setError('No se pudo actualizar el permiso');
    } finally {
      setActionLoading(null);
    }
  };

  // Cambiar status del usuario
  const handleToggleStatus = async () => {
    if (!id || !user) return;
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    setActionLoading('status');

    try {
      await updateUserStatus(id, newStatus);
      setUser({ ...user, status: newStatus });
    } catch {
      setError('No se pudo cambiar el estado del usuario');
    } finally {
      setActionLoading(null);
    }
  };

  // Agrupar permisos por módulo para mostrarlos organizados
  const permissionsByModule = allPermissions.reduce(
    (acc, permission) => {
      if (!acc[permission.module]) acc[permission.module] = [];
      acc[permission.module].push(permission);
      return acc;
    },
    {} as Record<string, Permission[]>,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
        Cargando...
      </div>
    );
  }

  if (error || !user) {
    return <div className="text-red-600 text-sm py-4">{error || 'Usuario no encontrado'}</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/users')}
          className="text-gray-400 hover:text-gray-600 text-sm cursor-pointer"
        >
          ← Volver
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{user.full_name}</h1>
          <p className="text-gray-500 text-sm">{user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Datos del usuario */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Información</h2>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-500">Estado</span>
              <div className="mt-1 flex items-center gap-3">
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    user.status === 'active'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {user.status === 'active' ? 'Activo' : 'Inactivo'}
                </span>
                {hasPermission('users', 'update') && (
                  <button
                    onClick={handleToggleStatus}
                    disabled={actionLoading === 'status'}
                    className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading === 'status'
                      ? 'Cambiando...'
                      : user.status === 'active'
                        ? 'Desactivar'
                        : 'Activar'}
                  </button>
                )}
              </div>
            </div>
            <div>
              <span className="text-gray-500">Rol</span>
              <p className="mt-1 text-gray-800">{user.roles[0]?.name ?? 'Sin rol asignado'}</p>
            </div>
            <div>
              <span className="text-gray-500">Creado</span>
              <p className="mt-1 text-gray-800">
                {new Date(user.created_at).toLocaleDateString('es', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Permisos */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">
            Permisos
            <span className="ml-2 text-xs font-normal text-gray-400">
              {user.permissions.length} activos
            </span>
          </h2>

          {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}

          <div className="space-y-4">
            {Object.entries(permissionsByModule).map(([module, permissions]) => (
              <div key={module}>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  {module}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {permissions.map((permission) => {
                    const active = userHasPermission(permission.id);
                    const loading = actionLoading === permission.id;

                    return (
                      <button
                        key={permission.id}
                        onClick={() => handleTogglePermission(permission)}
                        disabled={loading || !hasPermission('users', 'update')}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                                    border transition-colors text-left cursor-pointer
                                    disabled:opacity-50 disabled:cursor-not-allowed ${
                                      active
                                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                    }`}
                      >
                        {/* Indicador de estado */}
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            active ? 'bg-blue-500' : 'bg-gray-300'
                          }`}
                        />
                        <span className="truncate">
                          {loading ? 'Actualizando...' : permission.action}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
