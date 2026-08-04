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
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { StatusBadge } from '../../components/ui/StatusBadge';

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
  const [confirmingStatusChange, setConfirmingStatusChange] = useState(false);

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
      const [userData, permissionData] = await Promise.all([getUserById(id), getPermissions()]);
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
      setConfirmingStatusChange(false);
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
            onClick={() => setConfirmingStatusChange(true)}
            disabled={isSaving}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
              user.status === 'active'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {user.status === 'active' ? 'Desactivar usuario' : 'Activar usuario'}
          </button>
        )}
      </div>

      {confirmingStatusChange && (
        <ConfirmDialog
          title={user.status === 'active' ? 'Desactivar usuario' : 'Activar usuario'}
          message={
            user.status === 'active'
              ? `¿Seguro que querés desactivar a ${user.full_name}? No podrá iniciar sesión mientras esté inactivo.`
              : `¿Reactivar a ${user.full_name}? Podrá iniciar sesión nuevamente.`
          }
          confirmLabel={user.status === 'active' ? 'Desactivar' : 'Activar'}
          danger={user.status === 'active'}
          loading={isSaving}
          onConfirm={handleToggleStatus}
          onCancel={() => setConfirmingStatusChange(false)}
        />
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Resumen</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-gray-500">Estado</dt>
              <dd className="mt-0.5">
                <StatusBadge active={user.status === 'active'} />
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
                {user.degree_title
                  ? `${user.degree_title}${user.university ? ` - ${user.university}` : ''}`
                  : 'No definida'}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              Permisos
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {canManageUsers ? 'Activa o revoca permisos individuales.' : 'Vista solo lectura.'}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-5">
          {Object.entries(
            permissions.reduce(
              (acc, permission) => {
                if (!acc[permission.module]) acc[permission.module] = [];
                acc[permission.module].push(permission);
                return acc;
              },
              {} as Record<string, Permission[]>,
            ),
          ).map(([module, modulePermissions]) => (
            <div key={module}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                {module}
              </h3>
              <div className="space-y-1">
                {modulePermissions.map((permission) => {
                  const assigned = hasAssignedPermission(permission.id);
                  return (
                    <label
                      key={permission.id}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors
                ${
                  assigned
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }
                ${!canManageUsers || isSaving ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
              `}
                    >
                      <input
                        type="checkbox"
                        checked={assigned}
                        disabled={!canManageUsers || isSaving}
                        onChange={() => handleTogglePermission(permission)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600
                           focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800">{permission.description}</p>
                        <p className="text-xs text-gray-400 uppercase tracking-wide mt-0.5">
                          {permission.action}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
