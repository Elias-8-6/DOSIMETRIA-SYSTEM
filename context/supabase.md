# Contexto Supabase / Base de Datos

## PostgreSQL — Schema del Sistema de Dosimetría

Base de datos PostgreSQL 17 gestionada con Supabase CLI. El backend NestJS accede via service role key (bypass RLS). El frontend **nunca** accede directamente.

## Estructura de Directorios

```
supabase/
├── config.toml              # Configuración local (puertos, auth, etc.)
├── migrations/              # Migraciones SQL ordenadas (001–015)
│   ├── 001_base_catalogs.sql
│   ├── 002_laboratory_infrastructure.sql
│   ├── 003_clients_workers_dosimeters.sql
│   ├── 004_service_orders_receptions_batches.sql
│   ├── 005_lab_processes_readings_qc.sql
│   ├── 006_documents_audit.sql
│   ├── 007_rls_policies.sql
│   ├── 008_stored_procedures.sql
│   ├── 009_seed_development.sql
│   ├── 010_granular_permissions.sql
│   ├── 011_refresh_tokens.sql
│   ├── 012_user_profile.sql
│   ├── 013_real_environment_fields.sql
│   ├── 014_performance_indexes.sql
│   └── 015_fix_dev_admin_password.sql
└── snippets/                # Queries útiles para desarrollo
    ├── organizations.sql
    ├── permissions.sql
    └── all users.sql
```

## Puertos Locales (supabase start)

| Servicio | Puerto |
|----------|--------|
| API (PostgREST) | 54321 |
| PostgreSQL | 54322 |
| Studio | 54323 |
| Inbucket (email) | 54324 |
| Analytics | 54327 |

## Comandos CLI

```bash
supabase start              # Levantar stack local
supabase stop               # Detener
supabase db reset           # Reset + migraciones + seed
supabase migration new <name>  # Nueva migración
supabase db diff            # Generar diff desde cambios locales
supabase status             # Ver URLs y keys
```

## Modelo de Datos — Tablas por Dominio

### Catálogos Base (001)

| Tabla | Descripción |
|-------|-------------|
| `organizations` | Multi-tenant: laboratory \| client |
| `roles` | admin_lab, tecnico_lab, coordinador_cliente, auditor |
| `dosimeter_types` | TLD, OSL, film, etc. |
| `dosimeter_statuses` | Estados del ciclo de vida del dosímetro |
| `process_definitions` | Definiciones de procesos de laboratorio |

### Infraestructura de Laboratorio (002)

| Tabla | Descripción |
|-------|-------------|
| `laboratory_sites` | Sedes del laboratorio |
| `areas` | Áreas dentro de cada sede |
| `users` | Usuarios del sistema (no confundir con auth.users de Supabase) |
| `user_roles` | Roles informativos por usuario |
| `training_records` | Capacitaciones del personal |
| `equipment` | Equipos del laboratorio |
| `equipment_calibrations` | Historial de calibraciones |
| `equipment_maintenance` | Mantenimientos |
| `environmental_records` | Condiciones ambientales |
| `process_steps` | Pasos de cada proceso definido |

### Clientes y Dosimetría (003)

| Tabla | Descripción |
|-------|-------------|
| `clients` | Instituciones cliente (FK → organizations) |
| `client_locations` | Sedes físicas del cliente |
| `workers` | Trabajadores dosimetrados (NO son users del sistema) |
| `dosimeters` | Activo del laboratorio — **sin FK a clients** |
| `dosimeter_assignments` | Asignación temporal dosímetro ↔ trabajador |

**Decisión de diseño**: `dosimeters` no tiene FK a `clients`. La relación dosímetro-cliente se establece via `dosimeter_assignments` (asignación a worker) y `service_order_items` (orden de servicio).

### Órdenes y Recepciones (004)

| Tabla | Descripción |
|-------|-------------|
| `service_orders` | Órdenes de servicio del cliente |
| `service_order_items` | Ítems (dosímetros) en cada orden |
| `receptions` | Recepción física en laboratorio |
| `reception_items` | Ítems recibidos |
| `lab_batches` | Lotes de procesamiento |
| `batch_items` | Dosímetros en cada lote |

### Procesos y Lecturas (005)

| Tabla | Descripción |
|-------|-------------|
| `process_executions` | Ejecución de un proceso sobre un lote |
| `process_execution_items` | Ítems procesados |
| `contamination_checks` | Verificación de contaminación |
| `cleaning_cycles` | Ciclos de limpieza |
| `dosimeter_readings` | Lecturas de dosis (Hp10, Hp007) |
| `qc_records` | Control de calidad |
| `incident_reports` | Reportes de incidentes |

### Documentos y Auditoría (006)

| Tabla | Descripción |
|-------|-------------|
| `documents` | Documentos del sistema |
| `document_versions` | Versiones de documentos |
| `attached_documents` | Documentos adjuntos a entidades |
| `audit_logs` | Log de auditoría ISO 17025 |

### Seguridad (007, 010, 011)

| Tabla | Descripción |
|-------|-------------|
| `permissions` | Catálogo: módulo + acción (ej: `dosimeters:create`) |
| `user_permissions` | Permisos por usuario (granted true/false) |
| `refresh_tokens` | Tokens de refresh con hash |

## Sistema de Permisos Granulares (010)

Modelo: `Usuario → user_permissions → permission (módulo + acción)`

Los roles (`user_roles`) son **informativos** — la autorización viene de `user_permissions`.

### Módulos de permisos

| Módulo | Acciones |
|--------|----------|
| users | create, read, update, delete |
| clients | create, read, update, delete |
| workers | create, read, update, delete |
| dosimeters | create, read, update, delete |
| assignments | create, read, update, delete |
| service_orders | create, read, update, delete |
| receptions | create, read, update, delete |
| lab_process | create, read, update, delete |
| readings | create, read, update, delete |
| reports | create, read, update, delete |
| equipment | create, read, update, delete |
| audit | read |

Formato del code: `modulo:accion` (ej: `clients:read`).

NestJS verifica con `@CheckPermission('modulo', 'accion')` → consulta `user_permissions` donde `granted = true`.

## Row Level Security (007)

RLS habilitado en todas las tablas críticas. Políticas basadas en `organization_id` del JWT.

Funciones auxiliares en schema `public`:
- `jwt_organization_id()` — extrae organization_id del JWT
- `jwt_user_id()` — extrae user_id del JWT
- `jwt_active_role()` — extrae rol activo (legacy, no usado en auth actual)

**Importante**: NestJS usa service role key → bypassa RLS. RLS protege acceso directo a PostgREST.

## Campos Extendidos (012, 013)

### users
`degree_title`, `university`, `location`, `document_number`, `phone`, `date_of_birth`, `hire_date`, `signature_url`, `profile_photo_url`

### workers
`date_of_birth`, `gender`, `phone`, `email`, `occupation`, `start_date`

### clients
`phone`, `address`, `website`, `client_type` (hospital, clinica, industria...), `contract_start_date`, `contract_end_date`

### client_locations
`phone`, `contact_name`, `radiation_type`, `risk_level`

### dosimeters
`wear_period_days`, `max_dose_limit`, `last_annealing_date`, `notes`

### dosimeter_readings
`hp10`, `hp007`, `background_dose`, `period_start`, `period_end`

## Índices de Performance (014)

- `idx_clients_org_name`, `idx_clients_org_status`
- `idx_users_org_created`, `idx_users_org_status`
- `idx_workers_client`, `idx_workers_location`
- `idx_client_locations_client`
- `idx_user_roles_user`

## Seed de Desarrollo (009)

Datos mínimos para probar el sistema:

| Entidad | ID fijo | Detalle |
|---------|---------|---------|
| Organización | `00000000-...-0001` | Laboratorio de Dosimetría Central |
| Sede | `00000000-...-0010` | Sede Principal + 5 áreas |
| Admin user | `00000000-...-0100` | admin@laboratorio.com |
| Password | — | `Admin123!@#$` |

El admin recibe rol `admin_lab` y todos los permisos del sistema.

## Stored Procedures (008)

Funciones almacenadas para operaciones complejas del dominio (consultar migración para detalle).

## Diagrama de Relaciones Principales

```
organizations
├── users (organization_id)
│   ├── user_roles → roles
│   └── user_permissions → permissions
├── clients (organization_id)
│   ├── client_locations
│   └── workers (client_id, client_location_id)
│       └── dosimeter_assignments → dosimeters
├── laboratory_sites
│   └── areas
├── equipment
│   ├── equipment_calibrations
│   └── equipment_maintenance
└── service_orders (client_id)
    ├── service_order_items → dosimeters
    └── receptions
        └── reception_items
            └── lab_batches
                └── batch_items → dosimeters
                    └── process_executions
                        └── dosimeter_readings
                            └── qc_records
```

## Convenciones de Schema

1. **UUIDs**: `uuid_generate_v4()` como PK default
2. **Timestamps**: `created_at timestamptz DEFAULT now()`
3. **Status**: CHECK constraints con valores fijos (`active`/`inactive`)
4. **Multi-tenant**: `organization_id` en tablas de negocio
5. **Trazabilidad ISO**: campos `granted_by`, `created_by`, `resolved_by` donde aplique
6. **Soft delete**: status `inactive` en lugar de DELETE físico
7. **Comentarios**: `COMMENT ON TABLE/COLUMN` en todas las tablas

## Variables de Entorno (Backend)

```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<service_role key de supabase status>
```

Obtener keys con `supabase status` después de `supabase start`.

## Notas para Desarrollo

- Nunca ejecutar seed (009) en producción
- Migraciones son incrementales — no modificar migraciones ya aplicadas
- Usar `supabase migration new` para cambios de schema
- Snippets en `supabase/snippets/` son queries de referencia, no migraciones
- PostgreSQL 17 — verificar compatibilidad al cambiar versión remota
