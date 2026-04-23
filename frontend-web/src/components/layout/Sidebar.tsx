import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ProfileModal } from '../users/ProfileModal';

/**
 * Sidebar — barra de navegación lateral.
 * El nombre del usuario abre el ProfileModal.
 */
export function Sidebar() {
  const { user, logout, hasPermission } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
      isActive
        ? 'bg-blue-50 text-blue-700 font-medium'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`;

  return (
    <>
      <aside className="w-60 min-h-screen bg-white border-r border-gray-200 flex flex-col">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-200">
          <h1 className="text-base font-bold text-gray-900">Dosimetría</h1>
          <p className="text-xs text-gray-400 mt-0.5">ISO 17025</p>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLink to="/dashboard" className={navClass}>
            <span>Dashboard</span>
          </NavLink>

          {hasPermission('users', 'read') && (
            <NavLink to="/users" className={navClass}>
              <span>Usuarios</span>
            </NavLink>
          )}

          {hasPermission('clients', 'read') && (
            <NavLink to="/clients" className={navClass}>
              <span>Clientes</span>
            </NavLink>
          )}
        </nav>

        {/* Info del usuario — click abre el modal de perfil */}
        <div className="px-4 py-4 border-t border-gray-200">
          <button
            onClick={() => setShowProfile(true)}
            className="w-full text-left mb-3 group cursor-pointer"
          >
            <p className="text-sm font-medium text-gray-800 truncate
                          group-hover:text-blue-600 transition-colors">
              {user?.full_name}
            </p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            {user?.roles[0] && (
              <span className="inline-block mt-1 text-xs bg-blue-50 text-blue-600
                               px-2 py-0.5 rounded-full">
                {user.roles[0].name}
              </span>
            )}
            <p className="text-xs text-blue-500 mt-1 opacity-0 group-hover:opacity-100
                          transition-opacity">
              Editar perfil
            </p>
          </button>

          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-red-500 hover:text-red-700
                       transition-colors duration-150 cursor-pointer"
          >
            Cerrar sesión
          </button>
        </div>

      </aside>

      {/* Modal de perfil — fuera del aside para evitar problemas de z-index */}
      {showProfile && (
        <ProfileModal onClose={() => setShowProfile(false)} />
      )}
    </>
  );
}
