import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ProfileModal } from '../users/ProfileModal';

/**
 * Sidebar — barra de navegación lateral fija y responsiva.
 * Mantiene la altura 100% de la ventana (100dvh), logo fijo arriba,
 * scroll interior en los links de navegación, y perfil/logout anclado al fondo.
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
      <aside className="w-60 h-dvh bg-white border-r border-gray-200 flex flex-col flex-shrink-0 select-none z-20 print:hidden">
        {/* Logo superior fijo */}
        <div className="px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              DS
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 leading-tight">Dosimetría</h1>
              <p className="text-[11px] text-gray-400">Sistema Integral</p>
            </div>
          </div>
        </div>

        {/* Navegación con scroll interior contenido */}
        <nav className="flex-1 min-h-0 px-3 py-3 space-y-1 overflow-y-auto">
          <NavLink to="/dashboard" className={navClass}>
            <span>Dashboard</span>
          </NavLink>

          {hasPermission('users', 'read') && (
            <NavLink to="/users" className={navClass}>
              <span>Personal de Laboratorio</span>
            </NavLink>
          )}

          {hasPermission('clients', 'read') && (
            <div className="space-y-1">
              <NavLink to="/clients" className={navClass}>
                <span>Clientes</span>
              </NavLink>

              {hasPermission('workers', 'read') && (
                <div className="ml-4 pl-2 border-l border-gray-200">
                  <NavLink
                    to="/workers"
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors duration-150 ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                      }`
                    }
                  >
                    <span className="text-gray-400 text-xs">↳</span>
                    <span>Personal POE</span>
                  </NavLink>
                </div>
              )}
            </div>
          )}

          {!hasPermission('clients', 'read') && hasPermission('workers', 'read') && (
            <NavLink to="/workers" className={navClass}>
              <span>Personal POE</span>
            </NavLink>
          )}

          {hasPermission('dosimeters', 'read') && (
            <div className="space-y-1">
              <NavLink to="/dosimeters" className={navClass}>
                <span>Dosímetros</span>
              </NavLink>

              <div className="ml-4 pl-2 border-l border-gray-200 space-y-1">
                {hasPermission('holders', 'read') && (
                  <NavLink
                    to="/dosimeters/holders"
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors duration-150 ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                      }`
                    }
                  >
                    <span className="text-gray-400 text-xs">↳</span>
                    <span>Portadosímetros</span>
                  </NavLink>
                )}
                <NavLink
                  to="/dosimeters/assembly"
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors duration-150 ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                >
                  <span className="text-gray-400 text-xs">↳</span>
                  <span>Ensamblaje</span>
                </NavLink>

                <NavLink
                  to="/integration"
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors duration-150 ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                >
                  <span className="text-gray-400 text-xs">↳</span>
                  <span>Integración TLD</span>
                </NavLink>
              </div>
            </div>
          )}

          {hasPermission('service_orders', 'read') && (
            <NavLink to="/service-orders" className={navClass}>
              <span>Órdenes de servicio</span>
            </NavLink>
          )}

          {hasPermission('receptions', 'read') && (
            <NavLink to="/receptions" className={navClass}>
              <span>Triaje</span>
            </NavLink>
          )}

          <NavLink to="/reports" className={navClass}>
            <span>Reportes Minsa y Alertas</span>
          </NavLink>
        </nav>

        {/* Info del usuario — fijo al pie */}
        <div className="px-4 py-3.5 border-t border-gray-200 flex-shrink-0 bg-white">
          <button
            onClick={() => setShowProfile(true)}
            className="w-full text-left mb-2 group cursor-pointer"
          >
            <p
              className="text-sm font-medium text-gray-800 truncate
                          group-hover:text-blue-600 transition-colors"
            >
              {user?.full_name}
            </p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            {user?.roles[0] && (
              <span
                className="inline-block mt-1 text-[11px] bg-blue-50 text-blue-600 font-medium
                               px-2 py-0.5 rounded-full"
              >
                {user.roles[0].name}
              </span>
            )}
          </button>

          <button
            onClick={handleLogout}
            className="w-full text-left text-xs text-red-500 hover:text-red-700 font-medium
                       transition-colors duration-150 cursor-pointer pt-0.5"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Modal de perfil — fuera del aside para evitar problemas de z-index */}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </>
  );
}
