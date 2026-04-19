import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

/**
 * Sidebar — barra de navegación lateral.
 * Muestra solo los módulos a los que el usuario tiene acceso
 * según sus permisos (hasPermission).
 */
export function Sidebar() {
  const { user, logout, hasPermission } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  // Clase base para los links de navegación
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
      isActive
        ? 'bg-blue-50 text-blue-700 font-medium'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`;

  return (
    <aside className="w-60 min-h-screen bg-white border-r border-gray-200 flex flex-col">
      {/* Logo / título */}
      <div className="px-5 py-5 border-b border-gray-200">
        <h1 className="text-base font-bold text-gray-900">Dosimetría</h1>
        <p className="text-xs text-gray-400 mt-0.5">ISO 17025</p>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {/* Dashboard — siempre visible */}
        <NavLink to="/dashboard" className={navClass}>
          <span>Dashboard</span>
        </NavLink>

        {/* Users — solo si tiene permiso de lectura */}
        {hasPermission('users', 'read') && (
          <NavLink to="/users" className={navClass}>
            <span>Usuarios</span>
          </NavLink>
        )}
      </nav>

      {/* Info del usuario y logout */}
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="mb-3">
          <p className="text-sm font-medium text-gray-800 truncate">{user?.full_name}</p>
          <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          {user?.roles[0] && (
            <span
              className="inline-block mt-1 text-xs bg-blue-50 text-blue-600
                             px-2 py-0.5 rounded-full"
            >
              {user.roles[0].name}
            </span>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-left text-sm text-red-500 hover:text-red-700
                     transition-colors duration-150 cursor-pointer"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
