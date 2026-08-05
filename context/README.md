# Contexto General del Proyecto

## Sistema de Trazabilidad de Dosimetría ISO 17025

Sistema de gestión para el control y trazabilidad de dosimetría ocupacional, orientado a laboratorios acreditados bajo la norma ISO 17025.

## Estructura del Proyecto

```
dosimetria-system/
├── backend/              # API NestJS (puerto 3000, prefijo /api/v1)
├── frontend-web/         # Aplicación React + Vite (puerto 5173)
├── supabase/             # PostgreSQL: migraciones, seeds, snippets
├── context/              # Documentación de contexto para agentes/desarrolladores
├── docker-compose.yml    # Desarrollo local (backend + frontend)
└── docker-compose.prod.yml
```

## Tecnologías Principales

| Capa | Stack |
|------|-------|
| Backend | NestJS 10, TypeScript 5, Passport JWT, Supabase JS Client |
| Frontend | React 19, TypeScript 6, Tailwind CSS 4, Vite 8, React Router 7, Axios |
| Base de datos | PostgreSQL 17 (Supabase local o remoto) |
| Autenticación | JWT en cookies httpOnly + refresh tokens en DB |
| Contenedores | Docker Compose |

## Estado Actual de Implementación

### Backend (implementado)
- **Auth**: login, logout, refresh, perfil, cambio de contraseña
- **Users**: CRUD, permisos granulares, catálogo de permisos
- **Clients**: CRUD, ubicaciones (sedes), cambio de estado
- **Workers**: CRUD, filtros por cliente/sede, cambio de estado

### Backend (en progreso / scaffold)
- **Dosimeters**: estructura de módulo, DTOs y use-cases creados; pendiente registrar en `AppModule` e implementar lógica

### Backend (pendiente)
- ServiceOrders, Receptions, LabProcess, Reports, Equipment, Audit

### Frontend (implementado)
- Login con cookies httpOnly y refresh automático
- Dashboard, Usuarios, Clientes (con detalle y ubicaciones), Trabajadores
- Rutas protegidas por autenticación y permisos granulares
- Sidebar con navegación condicional según permisos

### Frontend (pendiente)
- Dosímetros, órdenes de servicio, procesos de laboratorio, reportes

### Supabase (implementado)
- 15 migraciones SQL (001–015): schema completo del dominio
- RLS multi-tenant, permisos granulares, stored procedures, seed de desarrollo

## Arquitectura de Seguridad

```
Browser → React (cookies httpOnly) → NestJS API → Supabase (service role)
                                              ↓
                                    PermissionsGuard + RLS en DB
```

- El frontend **nunca** accede directamente a Supabase
- `organization_id` siempre viene del JWT, nunca del body del request
- Permisos granulares por usuario (`user_permissions`), no por rol
- Los roles son informativos para la UI

## Comandos de Desarrollo

```bash
# 1. Levantar Supabase local (requerido primero)
supabase start

# 2. Aplicar migraciones (si es necesario)
supabase db reset   # reset + migraciones + seed

# 3. Backend
cd backend && npm run start:dev

# 4. Frontend
cd frontend-web && npm run dev

# 5. Docker (alternativa)
docker-compose up -d
```

## URLs Locales

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000/api/v1 |
| Supabase Studio | http://localhost:54323 |
| Supabase API | http://localhost:54321 |

## Credenciales de Desarrollo

- **Email**: `admin@laboratorio.com`
- **Password**: `Admin123!@#$` (ver migración 009/015)

## Variables de Entorno Principales

### Backend (`backend/.env`)
- `SUPABASE_URL` — URL del proyecto Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (bypass RLS)
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — Secretos para tokens
- `CORS_ORIGINS` — Orígenes permitidos (default: `http://localhost:5173`)
- `PORT` — Puerto del backend (default: 3000)
- `COOKIE_SECURE` / `COOKIE_SAME_SITE` — Configuración de cookies

### Frontend (`frontend-web/.env`)
- `VITE_API_URL` — Base URL de la API (default en dev: `/api/v1` vía proxy Vite)
- `VITE_PROXY_TARGET` — Target del proxy Vite (default: `http://localhost:3000`)

## Convenciones del Proyecto

1. **Multi-tenant**: toda query filtra por `organization_id` del JWT
2. **Permisos**: `@CheckPermission('modulo', 'accion')` en controllers
3. **Paginación**: `normalizePagination()` + `sanitizeSearchTerm()`
4. **Use-cases**: lógica de negocio en `use-cases/`, controllers delgados
5. **Auditoría ISO**: `AuditService.log()` en CREATE / UPDATE / STATUS_CHANGE
6. **DTOs**: validación con class-validator, `whitelist: true` global

## Archivos de Contexto

| Archivo | Contenido |
|---------|-----------|
| [backend.md](./backend.md) | API NestJS: módulos, endpoints, patrones |
| [frontend.md](./frontend.md) | React: rutas, componentes, API client |
| [supabase.md](./supabase.md) | PostgreSQL: schema, migraciones, RLS, permisos |
