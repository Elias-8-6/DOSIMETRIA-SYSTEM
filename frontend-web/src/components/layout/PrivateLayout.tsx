import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

/**
 * PrivateLayout — layout base para todas las páginas privadas.
 * Contiene el Sidebar a la izquierda y el contenido a la derecha.
 *
 * <Outlet /> es donde React Router renderiza la página activa
 * según la ruta — DashboardPage, UsersPage, etc.
 */
export function PrivateLayout() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
