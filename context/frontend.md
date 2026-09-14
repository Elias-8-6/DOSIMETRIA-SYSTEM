# Contexto Frontend

## React + Vite — Aplicación Web

SPA con autenticación basada en cookies httpOnly. El frontend no accede directamente a Supabase.

## Stack Tecnológico

| Dependencia | Versión | Uso |
|-------------|---------|-----|
| React | 19.x | UI |
| TypeScript | 6.x | Lenguaje |
| Vite | 8.x | Build tool + dev server |
| Tailwind CSS | 4.x | Estilos (plugin `@tailwindcss/vite`) |
| React Router | 7.x | Routing |
| Axios | 1.x | HTTP client |
| ESLint | 9.x | Linting |
| Prettier | 3.x | Formateo |

## Estructura de Directorios

```
frontend-web/src/
├── main.tsx                   # Entry point + AuthProvider
├── App.tsx                    # AppRouter
├── index.css                  # Tailwind + estilos globales
├── api/                       # Clientes HTTP por dominio
│   ├── axios.config.ts        # Instancia Axios + interceptor refresh
│   ├── auth.api.ts            # Login, logout, perfil
│   ├── users.api.ts           # CRUD usuarios y permisos
│   ├── clients.api.ts         # CRUD clientes y ubicaciones
│   ├── workers.api.ts         # CRUD trabajadores
│   └── profile.api.ts         # Actualización de perfil
├── context/
│   ├── AuthContext.tsx        # Provider de autenticación
│   └── auth.context.ts        # Context type + hook export
├── hooks/
│   ├── useAuth.ts             # Acceso al contexto de auth
│   └── usePermissions.ts      # Helper de permisos
├── router/
│   └── AppRouter.tsx          # Rutas + guards
├── components/
│   ├── layout/
│   │   ├── PrivateLayout.tsx  # Layout con Sidebar
│   │   └── Sidebar.tsx        # Navegación lateral
│   ├── users/
│   │   ├── CreateUserModal.tsx
│   │   ├── UserFormModal.tsx
│   │   └── ProfileModal.tsx
│   ├── clients/
│   │   ├── ClientFormModal.tsx
│   │   ├── ClientDetailModal.tsx
│   │   └── LocationFormModal.tsx
│   └── workers/
│       ├── WorkerFormModal.tsx
│       └── WorkerDetailModal.tsx
├── pages/
│   ├── login/LoginPage.tsx
│   ├── dashboard/DashboardPage.tsx
│   ├── users/
│   │   ├── UsersPage.tsx
│   │   └── UserDetailPage.tsx
│   ├── clients/
│   │   ├── ClientPage.tsx
│   │   └── ClientDetailPage.tsx
│   └── workers/WorkersPage.tsx
└── assets/
```

## Configuración de API

### Axios (`api/axios.config.ts`)

```typescript
baseURL: import.meta.env.VITE_API_URL ?? '/api/v1'
withCredentials: true  // Envía cookies httpOnly
```

**Interceptor de refresh**: ante un 401, intenta `POST /auth/refresh` y reintenta la request original. Si falla, redirige a `/login`.

### Proxy Vite (`vite.config.ts`)

En desarrollo, `/api` se proxea a `http://localhost:3000` (configurable con `VITE_PROXY_TARGET`).

## Autenticación

### AuthContext

Estado global:
- `user: UserProfile | null`
- `isLoading: boolean`
- `isAuthenticated: boolean`
- `login(credentials)` — POST login + carga perfil
- `logout()` — POST logout + limpia estado
- `hasPermission(module, action)` — verifica permisos del perfil
- `refreshProfile()` — recarga perfil

Al montar la app, intenta `GET /auth/profile`; si falla, intenta refresh automático.

### UserProfile

```typescript
interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  status: string;
  organization: string;
  degree_title: string | null;
  university: string | null;
  location: string | null;
  document_number: string | null;
  phone: string | null;
  date_of_birth: string | null;
  hire_date: string | null;
  signature_url: string | null;
  profile_photo_url: string | null;
  roles: { code: string; name: string }[];
  permissions: { code: string; module: string; action: string }[];
}
```

## Rutas

| Ruta | Componente | Protección |
|------|------------|------------|
| `/` | Redirect → `/dashboard` | — |
| `/login` | LoginPage | Pública (redirect si autenticado) |
| `/dashboard` | DashboardPage | Privada |
| `/users` | UsersPage | Privada + `users:read` |
| `/users/:id` | UserDetailPage | Privada + `users:read` |
| `/clients` | ClientPage | Privada + `clients:read` |
| `/clients/:id` | ClientDetailPage | Privada + `clients:read` |
| `/workers` | WorkersPage | Privada + `workers:read` |
| `*` | Redirect → `/dashboard` | — |

### Guards de ruta

- **PrivateRoute**: requiere autenticación
- **PublicRoute**: solo para no autenticados
- **PermissionRoute**: requiere permiso `module:action` via `hasPermission()`

Todas las páginas usan lazy loading con `React.lazy()` + `Suspense`.

## Sidebar

Navegación condicional según permisos:

| Link | Permiso requerido |
|------|-------------------|
| Dashboard | Siempre visible |
| Usuarios | `users:read` |
| Clientes | `clients:read` |
| Trabajadores | `workers:read` |

Click en nombre de usuario abre `ProfileModal` (editar perfil y contraseña).

## Páginas Implementadas

### LoginPage
Formulario email/password. Redirige a dashboard tras login exitoso.

### DashboardPage
Página de inicio post-login.

### UsersPage / UserDetailPage
- Listado paginado con búsqueda
- Crear/editar usuarios via modales
- Asignar/revocar permisos en detalle

### ClientPage / ClientDetailPage
- Listado con filtros (status, client_type, búsqueda)
- Crear/editar clientes
- Gestión de ubicaciones (sedes) en detalle

### WorkersPage
- Listado con filtros por cliente y sede
- Crear/editar trabajadores via modales
- Modal de detalle

## Páginas Pendientes

- Dosímetros (listado, detalle, asignación, historial)
- Órdenes de servicio
- Recepciones
- Procesos de laboratorio
- Lecturas y QC
- Reportes
- Equipos
- Auditoría

## Patrones de UI

- **Modales** para crear/editar entidades (no páginas separadas)
- **Tablas** con paginación server-side
- **Tailwind CSS 4** con clases utilitarias
- Layout: sidebar fijo (240px) + contenido principal
- Colores: azul para activo, gris para neutro, rojo para logout/eliminar

## Scripts

```bash
npm run dev          # Dev server en :5173
npm run build        # tsc + vite build
npm run preview      # Preview de producción
npm run lint         # ESLint
npm run format       # Prettier
```

## Variables de Entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `VITE_API_URL` | `/api/v1` | Base URL de la API |
| `VITE_PROXY_TARGET` | `http://localhost:3000` | Target del proxy Vite |

## Convenciones

1. Un archivo API por módulo de backend (`*.api.ts`)
2. Tipos de respuesta definidos junto a las funciones API
3. Permisos verificados en router (`PermissionRoute`) y sidebar (`hasPermission`)
4. Lazy loading de todas las páginas
5. Modales controlados con `useState` local en la página padre
