# Contexto Backend

## NestJS API — Sistema de Dosimetría

API REST con prefijo global `/api/v1`. Autenticación via cookies httpOnly (`access_token`, `refresh_token`).

## Stack Tecnológico

| Dependencia | Versión | Uso |
|-------------|---------|-----|
| NestJS | 10.x | Framework |
| TypeScript | 5.x | Lenguaje |
| @supabase/supabase-js | 2.x | Cliente PostgreSQL |
| Passport + JWT | — | Autenticación |
| class-validator | 0.14 | Validación DTOs |
| bcryptjs | 3.x | Hash de contraseñas |
| helmet | 8.x | Headers de seguridad |
| @nestjs/throttler | 6.x | Rate limiting |
| cookie-parser | 1.x | Cookies httpOnly |
| Jest | 29.x | Testing |

## Estructura de Directorios

```
backend/src/
├── main.ts                    # Bootstrap: helmet, cookies, CORS, prefijo /api/v1
├── app.module.ts              # Módulo raíz + guards globales
├── auth/                      # Autenticación y sesión
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── dto/
│   ├── strategies/            # jwt.strategy, jwt-refresh.strategy
│   └── use-cases/
├── users/                     # Gestión de usuarios y permisos
│   ├── users.controller.ts
│   ├── users.service.ts
│   ├── dto/
│   └── use-cases/
├── clients/                   # Instituciones cliente y sedes
│   ├── clients.controller.ts
│   ├── clients.service.ts
│   ├── dto/
│   └── use-cases/
├── workers/                   # Trabajadores dosimetrados
│   ├── workers.controller.ts
│   ├── workers.service.ts
│   ├── dto/
│   └── use-case/
├── dosimeters/                # Dosímetros (scaffold — pendiente integrar)
│   ├── dosimeters.controller.ts
│   ├── dosimeters.service.ts
│   ├── dosimeters.module.ts
│   ├── dto/
│   └── use-cases/
├── common/
│   ├── decorators/            # @Public(), @CurrentUser(), @CheckPermission()
│   ├── filters/               # HttpExceptionFilter
│   ├── guards/                # JwtGuard, JwtRefreshGuard, PermissionsGuard
│   ├── interfaces/            # JwtPayload, PermissionModule, PermissionAction
│   ├── services/              # PermissionsCacheService, AuditService
│   └── utils/                 # cookie, password, search, pagination, token-hash
└── config/
    ├── supabase.module.ts     # Módulo global Supabase + servicios transversales
    └── supabase.config.ts     # SupabaseService (service role client)
```

## Path Aliases (tsconfig)

```
@common/*     → src/common/*
@config/*     → src/config/*
@auth/*       → src/auth/*
@clients/*    → src/clients/*
@dosimeters/* → src/dosimeters/*
```

## Guards y Middleware Globales

Registrados en `app.module.ts`:

| Guard/Pipe | Alcance | Descripción |
|------------|---------|-------------|
| ValidationPipe | Global | `whitelist`, `forbidNonWhitelisted`, `transform` |
| HttpExceptionFilter | Global | Formato uniforme de errores |
| ThrottlerGuard | Global | 100 req/min; login: 5/min |
| JwtGuard | Global | Protege todo; excepción con `@Public()` |

Por controller (donde aplique):

| Guard | Descripción |
|-------|-------------|
| PermissionsGuard | Verifica `@CheckPermission('modulo', 'accion')` contra `user_permissions` |
| JwtRefreshGuard | Solo en `POST /auth/refresh` |

## JWT Payload

```typescript
interface JwtPayload {
  sub: string;              // user_id
  email: string;
  full_name: string;
  organization_id: string;  // SIEMPRE usar esto, nunca del body
}
```

Los roles no van en el JWT — son informativos y se cargan en `/auth/profile`.

## Endpoints Implementados

### Auth (`/api/v1/auth`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/login` | Público | Login → cookies httpOnly |
| POST | `/refresh` | Refresh token | Renueva sesión |
| POST | `/logout` | JWT | Invalida refresh token |
| GET | `/profile` | JWT | Perfil + roles + permisos |
| PATCH | `/profile` | JWT | Actualizar perfil |
| PATCH | `/password` | JWT | Cambiar contraseña |

### Users (`/api/v1`)

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/permissions` | users:read | Catálogo de permisos |
| GET | `/users` | users:read | Listado paginado |
| GET | `/users/:id` | users:read | Detalle con permisos |
| POST | `/users` | users:create | Crear usuario |
| PATCH | `/users/:id` | users:update | Editar datos |
| PATCH | `/users/:id/status` | users:update | Activar/desactivar |
| POST | `/users/:id/permissions` | users:update | Asignar permiso |
| DELETE | `/users/:id/permissions/:permissionId` | users:update | Revocar permiso |

### Clients (`/api/v1/clients`)

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/` | clients:read | Listado paginado (search, status, client_type) |
| GET | `/:id` | clients:read | Detalle con ubicaciones |
| POST | `/` | clients:create | Crear cliente |
| PATCH | `/:id` | clients:update | Editar cliente |
| PATCH | `/:id/status` | clients:update | Cambiar estado |
| POST | `/:id/locations` | clients:update | Crear sede |
| PATCH | `/:id/locations/:locationId` | clients:update | Editar sede |
| PATCH | `/:id/locations/:locationId/status` | clients:update | Cambiar estado sede |

### Workers (`/api/v1/workers`)

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/` | workers:read | Listado (search, status, client_id, client_location_id) |
| GET | `/:id` | workers:read | Detalle |
| POST | `/` | workers:create | Crear trabajador |
| PATCH | `/:id` | workers:update | Editar trabajador |
| PATCH | `/:id/status` | workers:update | Cambiar estado |

### Dosimeters (pendiente — scaffold creado)

Estructura prevista en `dosimeters/`:

| Use-case | Descripción |
|----------|-------------|
| create-dosimeter | Registrar dosímetro nuevo |
| find-all-dosimeters | Listado paginado con filtros |
| find-one-dosimeter | Detalle |
| update-dosimeter | Editar datos |
| update-dosimeter-status | Cambiar estado del ciclo de vida |
| assign-dosimeter | Asignar a trabajador |
| return-dosimeter | Registrar devolución |
| get-dosimeter-history | Historial de asignaciones y eventos |

Permisos: `dosimeters:*` y `assignments:*`.

## Patrón de Módulo

Cada módulo de dominio sigue esta estructura:

```
modulo/
├── modulo.module.ts       # Registra controller, service, use-cases
├── modulo.controller.ts   # Endpoints delgados con @CheckPermission
├── modulo.service.ts      # Orquesta use-cases
├── dto/                   # DTOs con class-validator
└── use-cases/             # Lógica de negocio (una clase por operación)
```

### Checklist para nuevos módulos

1. Registrar en `app.module.ts`
2. `@UseGuards(JwtGuard, PermissionsGuard)` a nivel de controller
3. `@CheckPermission('modulo', 'accion')` en cada endpoint
4. `organization_id` desde `@CurrentUser()`, nunca del body
5. Paginación con `normalizePagination()` y `sanitizeSearchTerm()`
6. `AuditService.log()` en CREATE / UPDATE / STATUS_CHANGE
7. Agregar path alias en `tsconfig.json` si aplica

## Servicios Transversales

### PermissionsCacheService
Cache en memoria de permisos por usuario (TTL 60s). Usado por `PermissionsGuard`.

### AuditService
Registra acciones en `audit_logs` para trazabilidad ISO 17025.

### SupabaseService
Cliente con service role key — bypassa RLS. Único punto de acceso a la DB.

## Utilidades Comunes

| Util | Archivo | Uso |
|------|---------|-----|
| `normalizePagination(page, limit)` | pagination.util.ts | Paginación (max 100, default 10) |
| `sanitizeSearchTerm(raw)` | search.util.ts | Sanitiza búsquedas para PostgREST ilike |
| `setAuthCookies()` / `clearAuthCookies()` | cookie.util.ts | Manejo de cookies JWT |
| `hashPassword()` / `comparePassword()` | password.util.ts | bcrypt |
| `hashToken()` | token-hash.util.ts | Hash de refresh tokens |

## Scripts

```bash
npm run start:dev      # Desarrollo con watch
npm run start:debug    # Debug con watch
npm run start:prod     # Producción (node dist/main)
npm run build          # Compilar TypeScript
npm run lint           # ESLint
npm run test           # Jest
npm run test:cov       # Coverage
```

## Módulos Pendientes (comentados en app.module.ts)

- DosimetersModule
- ServiceOrdersModule
- ReceptionsModule
- LabProcessModule
- ReportsModule
