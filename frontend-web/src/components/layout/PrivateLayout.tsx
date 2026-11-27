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
    <div className="flex h-dvh w-screen overflow-hidden bg-gray-50 print:h-auto print:overflow-visible">
      <Sidebar />
      <main className="flex-1 min-w-0 h-full overflow-y-auto print:h-auto print:overflow-visible">
        <Outlet />
      </main>
    </div>
  );
}
