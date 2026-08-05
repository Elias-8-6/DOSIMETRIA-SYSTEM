import { useAuth } from '../../hooks/useAuth';

/**
 * DashboardPage — página principal después del login.
 * Por ahora muestra un resumen básico del usuario.
 * Se puede expandir con estadísticas del laboratorio.
 */
export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Bienvenido, {user?.full_name}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Información de sesión</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            <span className="font-medium">Email:</span> {user?.email}
          </p>
          <p>
            <span className="font-medium">Organización:</span> {user?.organization}
          </p>
          <p>
            <span className="font-medium">Rol:</span> {user?.roles.map((r) => r.name).join(', ')}
          </p>
          <p>
            <span className="font-medium">Permisos activos:</span> {user?.permissions.length}
          </p>
        </div>
      </div>
    </div>
  );
}
