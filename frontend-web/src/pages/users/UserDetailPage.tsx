import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  assignPermission,
  getPermissions,
  getUserById,
  revokePermission,
  updateUserStatus,
  type Permission,
  type UserDetail,
} from '../../api/users.api';
import { useAuth } from '../../hooks/useAuth';

const roleLabelByCode: Record<string, string> = {
  admin_lab: 'Administrador de laboratorio',
  tecnico: 'Tecnico',
  tecnico_lab: 'Tecnico de laboratorio',
  dosimetrista: 'Dosimetrista',
  coordinador: 'Coordinador',
  coordinador_cliente: 'Coordinador de cliente',
  auditor: 'Auditor',
};

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [user, setUser] = useState<UserDetail | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const canManageUsers = hasPermission('users', 'update');

  const loadData = useCallback(async () => {
    if (!id) {
      setError('Usuario no encontrado');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [userData, permissionData] = await Promise.all([
        getUserById(id),
        getPermissions(),
      ]);
      setUser(userData);
      setPermissions(permissionData);
    } catch {
      setError('No se pudo cargar el detalle del usuario');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const hasAssignedPermission = (permissionId: string) =>
    !!user?.permissions.some((permission) => permission.id === permissionId);

  const handleToggleStatus = async () => {
    if (!user || !canManageUsers) return;

    setIsSaving(true);
    setError('');

    try {
      const nextStatus = user.status === 'active' ? 'inactive' : 'active';
      await updateUserStatus(user.id, nextStatus);
      setUser({ ...user, status: nextStatus });
    } catch {
      setError('No se pudo actualizar el estado del usuario');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePermission = async (permission: Permission) => {
    if (!user || !canManageUsers) return;

    setIsSaving(true);
    setError('');

    try {
      if (hasAssignedPermission(permission.id)) {
        await revokePermission(user.id, permission.id);
      } else {
        await assignPermission(user.id, permission.id);
      }

      await loadData();
    } catch {
      setError('No se pudieron actualizar los permisos del usuario');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Cargando detalle del usuario...</div>;
  }

  if (error && !user) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={() => navigate('/users')}
          className="mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700"
        >
          Volver
        </button>
      </div>
    );
  }

  if (!user) {
    return <div className="p-6 text-sm text-gray-500">Usuario no encontrado.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/users" className="text-sm text-blue-600 hover:text-blue-800">
            Volver a usuarios
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{user.full_name}</h1>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>

        {canManageUsers && (
          <button
            onClick={handleToggleStatus}
            disabled={isSaving}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: user.status === 'active' ? '#dc2626' : '#16a34a' }}
          >
            {user.status === 'active' ? 'Desactivar usuario' : 'Activar usuario'}
          </button>
        )}
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Resumen</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-gray-500">Estado</dt>
              <dd className="font-medium text-gray-900">
                {user.status === 'active' ? 'Activo' : 'Inactivo'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Rol</dt>
              <dd className="font-medium text-gray-900">
                {roleLabelByCode[user.roles[0]?.code ?? ''] ?? user.roles[0]?.name ?? 'Sin rol'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Creado</dt>
              <dd className="font-medium text-gray-900">
                {new Date(user.created_at).toLocaleDateString('es-PA')}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Perfil</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-gray-500">Documento</dt>
              <dd className="font-medium text-gray-900">{user.document_number ?? 'No definido'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Telefono</dt>
              <dd className="font-medium text-gray-900">{user.phone ?? 'No definido'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Ubicacion</dt>
              <dd className="font-medium text-gray-900">{user.location ?? 'No definida'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Formacion</dt>
              <dd className="font-medium text-gray-900">
                {user.degree_title ? `${user.degree_title}${user.university ? ` - ${user.university}` : ''}` : 'No definida'}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Permisos</h2>
            <p className="mt-1 text-sm text-gray-500">
              {canManageUsers ? 'Activa o revoca permisos individuales.' : 'Vista solo lectura.'}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {permissions.map((permission) => {
            const assigned = hasAssignedPermission(permission.id);

            return (
              <button
                key={permission.id}
                type="button"
                disabled={!canManageUsers || isSaving}
                onClick={() => handleTogglePermission(permission)}
                className={`rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  assigned
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <p className="text-sm font-semibold text-gray-900">{permission.description}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">
                  {permission.module} / {permission.action}
                </p>
                <p className="mt-3 text-xs font-medium text-gray-600">
                  {assigned ? 'Asignado' : 'No asignado'}
                </p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
