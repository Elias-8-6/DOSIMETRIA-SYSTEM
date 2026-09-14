-- ============================================================
-- MIGRACIÓN 005 — Sistema documental, auditoría y seguridad
--
-- Consolida: 006 (documents/audit_logs), 010 (permissions/user_permissions),
--            011 (refresh_tokens), 018 (audit_logs: ip_address/user_agent/
--            LOGIN_FAILED), 019 (trigger audit_logs inmutable),
--            021 (particionado audit_logs), 022 (índices audit),
--            025 (índice único document_versions)
-- ============================================================

-- ------------------------------------------------------------
-- documents
-- Documentos del sistema de gestión de calidad.
-- ISO 17025: procedimientos, instrucciones y formularios
-- deben estar controlados y versionados.
-- ------------------------------------------------------------
CREATE TABLE documents (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_type text        NOT NULL CHECK (document_type IN (
                  'procedimiento', 'instruccion_trabajo', 'formulario', 'politica', 'registro'
                )),
  code          text        UNIQUE,
  title         text        NOT NULL,
  status        text        NOT NULL DEFAULT 'vigente' CHECK (status IN (
                  'borrador', 'vigente', 'obsoleto'
                )),
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE documents IS 'Documentos del SGC. ISO 17025 exige control documental de procedimientos e instrucciones.';

-- ------------------------------------------------------------
-- document_versions
-- Versiones de cada documento. Solo una versión puede estar
-- marcada como current_version = true por documento.
-- El índice parcial único (migración 025) garantiza esto a nivel de DB.
-- ------------------------------------------------------------
CREATE TABLE document_versions (
  id              uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id     uuid    NOT NULL REFERENCES documents (id),
  version         text    NOT NULL,
  effective_date  date,
  file_url        text,
  current_version boolean NOT NULL DEFAULT false,
  UNIQUE (document_id, version)
);

COMMENT ON TABLE  document_versions                IS 'Versiones de documentos. Solo una versión activa por documento.';
COMMENT ON COLUMN document_versions.file_url        IS 'URL al archivo en Supabase Storage.';
COMMENT ON COLUMN document_versions.current_version IS 'NestJS garantiza que solo una versión tenga true por document_id.';

-- Índice único parcial (migración 025): garantiza a nivel de DB que
-- solo una versión tenga current_version = true por documento.
CREATE UNIQUE INDEX idx_document_versions_single_current
  ON document_versions (document_id)
  WHERE current_version;

COMMENT ON INDEX idx_document_versions_single_current IS 'Garantiza a nivel de DB que solo una versión por documento tenga current_version = true.';

-- ------------------------------------------------------------
-- attached_documents
-- Tabla de unión polimórfica. Un documento puede adjuntarse
-- a una ejecución de proceso, una orden, o un dosímetro.
-- Solo uno de los campos FK debe tener valor a la vez.
-- NestJS valida esto antes de insertar; la DB lo refuerza con CHECK.
-- ------------------------------------------------------------
CREATE TABLE attached_documents (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id          uuid NOT NULL REFERENCES documents (id),
  process_execution_id uuid REFERENCES process_executions (id),
  service_order_id     uuid REFERENCES service_orders (id),
  dosimeter_id         uuid REFERENCES dosimeters (id),
  attachment_type      text NOT NULL CHECK (attachment_type IN (
                         'evidencia', 'certificado', 'formulario', 'reporte'
                       )),
  CONSTRAINT attached_documents_single_ref CHECK (
    (process_execution_id IS NOT NULL)::int +
    (service_order_id IS NOT NULL)::int +
    (dosimeter_id IS NOT NULL)::int = 1
  )
);

COMMENT ON TABLE  attached_documents IS 'Adjuntos polimórficos. Un documento se vincula a exactamente una entidad.';
COMMENT ON CONSTRAINT attached_documents_single_ref ON attached_documents
  IS 'Garantiza que solo una FK tenga valor — la validación polimórfica a nivel de base de datos.';

-- ------------------------------------------------------------
-- audit_logs
-- Registro inmutable de toda acción sobre entidades críticas.
-- ISO 17025: trazabilidad documental exige poder reconstruir
-- el estado de cualquier entidad en cualquier momento.
-- Esta tabla solo permite INSERT — los triggers de inmutabilidad
-- refuerzan esto a nivel de DB.
--
-- TABLA PARTICIONADA por RANGE sobre created_at (anual).
-- Con 70 años de retención regulatoria, es la segunda tabla de
-- mayor crecimiento del sistema.
--
-- Incluye desde el inicio:
--   - Campos base (006): id, user_id, active_role, entity_name, entity_id,
--                         action, old_values, new_values, created_at
--   - Campos de auth (018): ip_address, user_agent
--   - Action expandido (018): LOGIN_FAILED añadido al CHECK
-- ------------------------------------------------------------
CREATE TABLE audit_logs (
  id          uuid        NOT NULL DEFAULT uuid_generate_v4(),
  user_id     uuid        REFERENCES users (id),
  active_role text,
  entity_name text        NOT NULL,
  entity_id   uuid,
  action      text        NOT NULL CHECK (action IN (
                'CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE',
                'LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'ROLE_SELECT'
              )),
  old_values  jsonb,
  new_values  jsonb,
  -- campos de auditoría de auth (migración 018)
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

COMMENT ON TABLE  audit_logs            IS 'Log de auditoría inmutable. ISO 17025: trazabilidad completa de todas las acciones críticas. Particionada por created_at (anual).';
COMMENT ON COLUMN audit_logs.active_role IS 'Rol con el que el usuario estaba operando al momento de la acción.';
COMMENT ON COLUMN audit_logs.old_values  IS 'Estado anterior de la entidad. NULL en acciones CREATE.';
COMMENT ON COLUMN audit_logs.new_values  IS 'Estado nuevo de la entidad. NULL en acciones DELETE.';
COMMENT ON COLUMN audit_logs.ip_address  IS 'IP de origen de la request. NULL en eventos que no vienen de un request HTTP directo.';
COMMENT ON COLUMN audit_logs.user_agent  IS 'User-Agent del cliente HTTP que originó el evento.';

-- Particiones anuales 2025-2028 + red de seguridad DEFAULT
CREATE TABLE audit_logs_2025    PARTITION OF audit_logs FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE audit_logs_2026    PARTITION OF audit_logs FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE audit_logs_2027    PARTITION OF audit_logs FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');
CREATE TABLE audit_logs_2028    PARTITION OF audit_logs FOR VALUES FROM ('2028-01-01') TO ('2029-01-01');
CREATE TABLE audit_logs_default PARTITION OF audit_logs DEFAULT;

COMMENT ON TABLE audit_logs_default IS 'Red de seguridad: recibe filas cuyo created_at cae fuera de las particiones anuales.';

-- Índices (del padre, se propagan a particiones automáticamente)
CREATE INDEX idx_audit_logs_entity  ON audit_logs (entity_name, entity_id);
CREATE INDEX idx_audit_logs_user    ON audit_logs (user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs (created_at DESC);

-- Trigger de inmutabilidad — audit_logs es estrictamente append-only
CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.reject_update_or_delete();

-- ------------------------------------------------------------
-- permissions
-- Catálogo de todos los permisos posibles del sistema.
-- Un permiso = módulo + acción (CRUD).
-- NestJS usa permission.code para verificar acceso en guards.
-- ------------------------------------------------------------
CREATE TABLE permissions (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        text NOT NULL UNIQUE,   -- formato: 'modulo:accion' ej: 'dosimeters:create'
  module      text NOT NULL,          -- módulo al que aplica
  action      text NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete')),
  description text NOT NULL
);

COMMENT ON TABLE  permissions        IS 'Catálogo de permisos del sistema. Cada permiso representa una acción CRUD sobre un módulo.';
COMMENT ON COLUMN permissions.code   IS 'Identificador único usado por NestJS. Formato: modulo:accion (ej: dosimeters:create)';
COMMENT ON COLUMN permissions.module IS 'Módulo del sistema al que aplica el permiso.';
COMMENT ON COLUMN permissions.action IS 'Acción CRUD permitida sobre el módulo.';

-- Catálogo de permisos del sistema
INSERT INTO permissions (code, module, action, description) VALUES
  -- Módulo: users
  ('users:create', 'users', 'create', 'Crear nuevos usuarios en el sistema'),
  ('users:read',   'users', 'read',   'Ver listado y detalle de usuarios'),
  ('users:update', 'users', 'update', 'Editar datos de usuarios existentes'),
  ('users:delete', 'users', 'delete', 'Desactivar o eliminar usuarios'),
  -- Módulo: clients
  ('clients:create', 'clients', 'create', 'Registrar nuevas instituciones cliente'),
  ('clients:read',   'clients', 'read',   'Ver listado y detalle de clientes'),
  ('clients:update', 'clients', 'update', 'Editar datos de clientes existentes'),
  ('clients:delete', 'clients', 'delete', 'Desactivar clientes'),
  -- Módulo: workers
  ('workers:create', 'workers', 'create', 'Registrar nuevos trabajadores'),
  ('workers:read',   'workers', 'read',   'Ver listado y detalle de trabajadores'),
  ('workers:update', 'workers', 'update', 'Editar datos de trabajadores'),
  ('workers:delete', 'workers', 'delete', 'Desactivar trabajadores'),
  -- Módulo: dosimeters
  ('dosimeters:create', 'dosimeters', 'create', 'Registrar nuevos dosímetros'),
  ('dosimeters:read',   'dosimeters', 'read',   'Ver listado, detalle e historial de dosímetros'),
  ('dosimeters:update', 'dosimeters', 'update', 'Editar datos y estado de dosímetros'),
  ('dosimeters:delete', 'dosimeters', 'delete', 'Dar de baja dosímetros'),
  -- Módulo: assignments
  ('assignments:create', 'assignments', 'create', 'Asignar dosímetros a trabajadores'),
  ('assignments:read',   'assignments', 'read',   'Ver historial de asignaciones'),
  ('assignments:update', 'assignments', 'update', 'Registrar devolución de dosímetros'),
  ('assignments:delete', 'assignments', 'delete', 'Cancelar asignaciones'),
  -- Módulo: service_orders
  ('service_orders:create', 'service_orders', 'create', 'Crear nuevas órdenes de servicio'),
  ('service_orders:read',   'service_orders', 'read',   'Ver listado y detalle de órdenes'),
  ('service_orders:update', 'service_orders', 'update', 'Editar y actualizar estado de órdenes'),
  ('service_orders:delete', 'service_orders', 'delete', 'Cancelar órdenes de servicio'),
  -- Módulo: receptions
  ('receptions:create', 'receptions', 'create', 'Registrar recepción física de dosímetros'),
  ('receptions:read',   'receptions', 'read',   'Ver recepciones y sus ítems'),
  ('receptions:update', 'receptions', 'update', 'Editar ítems de recepción'),
  ('receptions:delete', 'receptions', 'delete', 'Cancelar recepciones'),
  -- Módulo: lab_process
  ('lab_process:create', 'lab_process', 'create', 'Ejecutar pasos de proceso de laboratorio'),
  ('lab_process:read',   'lab_process', 'read',   'Ver ejecuciones de proceso y resultados'),
  ('lab_process:update', 'lab_process', 'update', 'Actualizar resultados de procesos'),
  ('lab_process:delete', 'lab_process', 'delete', 'Cancelar ejecuciones de proceso'),
  -- Módulo: readings
  ('readings:create', 'readings', 'create', 'Registrar lecturas de dosis'),
  ('readings:read',   'readings', 'read',   'Ver lecturas y resultados de dosis'),
  ('readings:update', 'readings', 'update', 'Corregir lecturas con observación'),
  ('readings:delete', 'readings', 'delete', 'Invalidar lecturas'),
  -- Módulo: reports
  ('reports:create', 'reports', 'create', 'Generar reportes e informes'),
  ('reports:read',   'reports', 'read',   'Ver y descargar reportes generados'),
  ('reports:update', 'reports', 'update', 'Regenerar reportes existentes'),
  ('reports:delete', 'reports', 'delete', 'Eliminar reportes generados'),
  -- Módulo: equipment
  ('equipment:create', 'equipment', 'create', 'Registrar nuevos equipos'),
  ('equipment:read',   'equipment', 'read',   'Ver equipos y sus calibraciones'),
  ('equipment:update', 'equipment', 'update', 'Actualizar datos y calibraciones de equipos'),
  ('equipment:delete', 'equipment', 'delete', 'Dar de baja equipos'),
  -- Módulo: audit (solo lectura — ISO 17025)
  ('audit:read', 'audit', 'read', 'Ver logs de auditoría del sistema');

-- ------------------------------------------------------------
-- user_permissions
-- Permisos asignados a cada usuario individualmente.
-- granted = true  → permiso concedido
-- granted = false → permiso explícitamente revocado
-- ------------------------------------------------------------
CREATE TABLE user_permissions (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid        NOT NULL REFERENCES users (id),
  permission_id uuid        NOT NULL REFERENCES permissions (id),
  granted       boolean     NOT NULL DEFAULT true,
  granted_by    uuid        NOT NULL REFERENCES users (id),
  granted_at    timestamptz NOT NULL DEFAULT now(),
  notes         text,
  UNIQUE (user_id, permission_id)
);

COMMENT ON TABLE  user_permissions            IS 'Permisos granulares por usuario. Fuente de verdad para autorización en NestJS.';
COMMENT ON COLUMN user_permissions.granted    IS 'true = permiso activo. false = permiso revocado (sin eliminar el registro).';
COMMENT ON COLUMN user_permissions.granted_by IS 'Usuario que otorgó o revocó el permiso. Trazabilidad ISO 17025.';

CREATE INDEX idx_user_permissions_lookup
  ON user_permissions (user_id, permission_id)
  WHERE granted = true;

COMMENT ON INDEX idx_user_permissions_lookup IS 'Optimiza la verificación de permisos en PermissionsGuard.';

-- ------------------------------------------------------------
-- refresh_tokens
-- Almacena los refresh tokens activos por usuario (hash, no texto plano).
-- FLUJO: Login → genera token → guarda hash → /refresh rota token
-- ------------------------------------------------------------
CREATE TABLE refresh_tokens (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid        NOT NULL REFERENCES users (id),
  token_hash  text        NOT NULL,
  expires_at  timestamptz NOT NULL,
  revoked     boolean     NOT NULL DEFAULT false,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  refresh_tokens            IS 'Refresh tokens activos por usuario. Solo se guarda el hash — nunca el token en texto plano.';
COMMENT ON COLUMN refresh_tokens.token_hash IS 'Hash bcryptjs del refresh token. El token real solo existe en el cliente.';
COMMENT ON COLUMN refresh_tokens.revoked    IS 'true = token invalidado. Se revoca en logout o al rotar tokens.';
COMMENT ON COLUMN refresh_tokens.revoked_at IS 'Timestamp de cuándo fue revocado. Útil para auditoría.';
COMMENT ON COLUMN refresh_tokens.expires_at IS 'Fecha de expiración. Aunque revoked=false, si expiró no se acepta.';

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id) WHERE revoked = false;
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens (token_hash) WHERE revoked = false;

COMMENT ON INDEX idx_refresh_tokens_user IS 'Optimiza la búsqueda de tokens activos por usuario en logout.';
COMMENT ON INDEX idx_refresh_tokens_hash IS 'Optimiza la verificación del refresh token en /auth/refresh.';
