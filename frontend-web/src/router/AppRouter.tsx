import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { PrivateLayout } from '../components/layout/PrivateLayout';

const LoginPage = lazy(() =>
  import('../pages/login/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const UsersPage = lazy(() =>
  import('../pages/users/UsersPage').then((m) => ({ default: m.UsersPage })),
);
const UserDetailPage = lazy(() =>
  import('../pages/users/UserDetailPage').then((m) => ({ default: m.UserDetailPage })),
);
const WorkersPage = lazy(() => import('../pages/workers/WorkersPage'));
const DashboardPage = lazy(() =>
  import('../pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const ClientsPage = lazy(() => import('../pages/clients/ClientPage'));
const ClientDetailPage = lazy(() => import('../pages/clients/ClientDetailPage'));

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-gray-500">Cargando...</div>
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

function PermissionRoute({
  module,
  action,
  children,
}: {
  module: string;
  action: string;
  children: React.ReactNode;
}) {
  const { hasPermission } = useAuth();

  if (!hasPermission(module, action)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export function AppRouter() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        <Route
          path="/"
          element={
            <PrivateRoute>
              <PrivateLayout />
            </PrivateRoute>
          }
        >
          <Route path="dashboard" element={<DashboardPage />} />
          <Route
            path="users"
            element={
              <PermissionRoute module="users" action="read">
                <UsersPage />
              </PermissionRoute>
            }
          />
          <Route
            path="users/:id"
            element={
              <PermissionRoute module="users" action="read">
                <UserDetailPage />
              </PermissionRoute>
            }
          />
          <Route
            path="clients"
            element={
              <PermissionRoute module="clients" action="read">
                <ClientsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="clients/:id"
            element={
              <PermissionRoute module="clients" action="read">
                <ClientDetailPage />
              </PermissionRoute>
            }
          />
          <Route
            path="workers"
            element={
              <PermissionRoute module="workers" action="read">
                <WorkersPage />
              </PermissionRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
