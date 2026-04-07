-- ============================================================
-- MIGRACIÓN 010 — Sistema de permisos granulares
-- Reemplaza el control de acceso basado en roles (RBAC simple)
-- por permisos granulares por usuario sobre cada módulo.
--
-- MODELO:
--   Usuario → user_permissions → permission (módulo + acción)
--
-- Cada permiso representa una acción CRUD sobre un módulo:
--   módulo:  clients, dosimeters, workers, service_orders, etc.
--   acción:  create, read, update, delete
--
-- Los roles (admin_lab, tecnico_lab, etc.) se mantienen como
-- etiqueta informativa del usuario pero ya NO son la fuente
-- de autorización. NestJS verifica user_permissions directamente.
-- ============================================================

-- ------------------------------------------------------------
-- permissions
-- Catálogo de todos los permisos posibles del sistema.
-- Un permiso = módulo + acción.
-- NestJS usa permission.code para verificar acceso.
-- ------------------------------------------------------------
CREATE TABLE permissions (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        text NOT NULL UNIQUE,  -- formato: 'modulo:accion' ej: 'dosimeters:create'
  module      text NOT NULL,         -- módulo al que aplica: 'dosimeters', 'clients', etc.
  action      text NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete')),
  description text NOT NULL
);

COMMENT ON TABLE  permissions        IS 'Catálogo de permisos del sistema. Cada permiso representa una acción CRUD sobre un módulo.';
COMMENT ON COLUMN permissions.code   IS 'Identificador único usado por NestJS. Formato: modulo:accion (ej: dosimeters:create)';
COMMENT ON COLUMN permissions.module IS 'Módulo del sistema al que aplica el permiso.';
COMMENT ON COLUMN permissions.action IS 'Acción CRUD permitida sobre el módulo.';

-- ------------------------------------------------------------
-- Permisos del sistema
-- Se crean todos los permisos posibles para cada módulo.
-- El admin asigna los que correspondan a cada usuario.
-- ------------------------------------------------------------

-- Módulo: users (gestión de usuarios del sistema)
INSERT INTO permissions (code, module, action, description) VALUES
  ('users:create', 'users', 'create', 'Crear nuevos usuarios en el sistema'),
  ('users:read',   'users', 'read',   'Ver listado y detalle de usuarios'),
  ('users:update', 'users', 'update', 'Editar datos de usuarios existentes'),
  ('users:delete', 'users', 'delete', 'Desactivar o eliminar usuarios');

-- Módulo: clients (gestión de instituciones cliente)
INSERT INTO permissions (code, module, action, description) VALUES
  ('clients:create', 'clients', 'create', 'Registrar nuevas instituciones cliente'),
  ('clients:read',   'clients', 'read',   'Ver listado y detalle de clientes'),
  ('clients:update', 'clients', 'update', 'Editar datos de clientes existentes'),
  ('clients:delete', 'clients', 'delete', 'Desactivar clientes');

-- Módulo: workers (gestión de trabajadores de instituciones)
INSERT INTO permissions (code, module, action, description) VALUES
  ('workers:create', 'workers', 'create', 'Registrar nuevos trabajadores'),
  ('workers:read',   'workers', 'read',   'Ver listado y detalle de trabajadores'),
  ('workers:update', 'workers', 'update', 'Editar datos de trabajadores'),
  ('workers:delete', 'workers', 'delete', 'Desactivar trabajadores');

-- Módulo: dosimeters (gestión de dosímetros)
INSERT INTO permissions (code, module, action, description) VALUES
  ('dosimeters:create', 'dosimeters', 'create', 'Registrar nuevos dosímetros'),
  ('dosimeters:read',   'dosimeters', 'read',   'Ver listado, detalle e historial de dosímetros'),
  ('dosimeters:update', 'dosimeters', 'update', 'Editar datos y estado de dosímetros'),
  ('dosimeters:delete', 'dosimeters', 'delete', 'Dar de baja dosímetros');

-- Módulo: assignments (asignación de dosímetros a trabajadores)
INSERT INTO permissions (code, module, action, description) VALUES
  ('assignments:create', 'assignments', 'create', 'Asignar dosímetros a trabajadores'),
  ('assignments:read',   'assignments', 'read',   'Ver historial de asignaciones'),
  ('assignments:update', 'assignments', 'update', 'Registrar devolución de dosímetros'),
  ('assignments:delete', 'assignments', 'delete', 'Cancelar asignaciones');

-- Módulo: service_orders (órdenes de servicio)
INSERT INTO permissions (code, module, action, description) VALUES
  ('service_orders:create', 'service_orders', 'create', 'Crear nuevas órdenes de servicio'),
  ('service_orders:read',   'service_orders', 'read',   'Ver listado y detalle de órdenes'),
  ('service_orders:update', 'service_orders', 'update', 'Editar y actualizar estado de órdenes'),
  ('service_orders:delete', 'service_orders', 'delete', 'Cancelar órdenes de servicio');

-- Módulo: receptions (recepción en laboratorio)
INSERT INTO permissions (code, module, action, description) VALUES
  ('receptions:create', 'receptions', 'create', 'Registrar recepción física de dosímetros'),
  ('receptions:read',   'receptions', 'read',   'Ver recepciones y sus ítems'),
  ('receptions:update', 'receptions', 'update', 'Editar ítems de recepción'),
  ('receptions:delete', 'receptions', 'delete', 'Cancelar recepciones');

-- Módulo: lab_process (procesos de laboratorio)
INSERT INTO permissions (code, module, action, description) VALUES
  ('lab_process:create', 'lab_process', 'create', 'Ejecutar pasos de proceso de laboratorio'),
  ('lab_process:read',   'lab_process', 'read',   'Ver ejecuciones de proceso y resultados'),
  ('lab_process:update', 'lab_process', 'update', 'Actualizar resultados de procesos'),
  ('lab_process:delete', 'lab_process', 'delete', 'Cancelar ejecuciones de proceso');

-- Módulo: readings (lecturas de dosis)
INSERT INTO permissions (code, module, action, description) VALUES
  ('readings:create', 'readings', 'create', 'Registrar lecturas de dosis'),
  ('readings:read',   'readings', 'read',   'Ver lecturas y resultados de dosis'),
  ('readings:update', 'readings', 'update', 'Corregir lecturas con observación'),
  ('readings:delete', 'readings', 'delete', 'Invalidar lecturas');

-- Módulo: reports (reportes e informes)
INSERT INTO permissions (code, module, action, description) VALUES
  ('reports:create', 'reports', 'create', 'Generar reportes e informes'),
  ('reports:read',   'reports', 'read',   'Ver y descargar reportes generados'),
  ('reports:update', 'reports', 'update', 'Regenerar reportes existentes'),
  ('reports:delete', 'reports', 'delete', 'Eliminar reportes generados');

-- Módulo: equipment (equipos del laboratorio)
INSERT INTO permissions (code, module, action, description) VALUES
  ('equipment:create', 'equipment', 'create', 'Registrar nuevos equipos'),
  ('equipment:read',   'equipment', 'read',   'Ver equipos y sus calibraciones'),
  ('equipment:update', 'equipment', 'update', 'Actualizar datos y calibraciones de equipos'),
  ('equipment:delete', 'equipment', 'delete', 'Dar de baja equipos');

-- Módulo: audit (logs de auditoría — ISO 17025)
INSERT INTO permissions (code, module, action, description) VALUES
  ('audit:read', 'audit', 'read', 'Ver logs de auditoría del sistema');

-- ------------------------------------------------------------
-- user_permissions
-- Permisos asignados a cada usuario individualmente.
-- Un usuario puede tener cualquier combinación de permisos
-- independientemente de su rol.
--
-- granted = true  → permiso concedido
-- granted = false → permiso explícitamente revocado
--                   (útil para revocar sin eliminar el registro)
-- ------------------------------------------------------------
CREATE TABLE user_permissions (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES users (id),
  permission_id uuid NOT NULL REFERENCES permissions (id),
  granted       boolean NOT NULL DEFAULT true,
  granted_by    uuid NOT NULL REFERENCES users (id),  -- quién otorgó el permiso
  granted_at    timestamptz NOT NULL DEFAULT now(),
  notes         text,                                 -- razón opcional del permiso
  UNIQUE (user_id, permission_id)                     -- un permiso por usuario máximo
);

COMMENT ON TABLE  user_permissions          IS 'Permisos granulares por usuario. Fuente de verdad para autorización en NestJS.';
COMMENT ON COLUMN user_permissions.granted  IS 'true = permiso activo. false = permiso revocado (sin eliminar el registro).';
COMMENT ON COLUMN user_permissions.granted_by IS 'Usuario que otorgó o revocó el permiso. Trazabilidad ISO 17025.';

-- Índice para la consulta más frecuente del sistema:
-- "¿tiene este usuario el permiso X?"
-- NestJS la ejecuta en cada request protegido.
CREATE INDEX idx_user_permissions_lookup
  ON user_permissions (user_id, permission_id)
  WHERE granted = true;

COMMENT ON INDEX idx_user_permissions_lookup IS 'Optimiza la verificación de permisos en PermissionsGuard.';

-- ------------------------------------------------------------
-- Habilitar RLS en las nuevas tablas
-- ------------------------------------------------------------
ALTER TABLE permissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- permissions: cualquier usuario autenticado puede leer el catálogo
CREATE POLICY "authenticated_read" ON permissions
  FOR SELECT USING (public.jwt_organization_id() IS NOT NULL);

-- user_permissions: cada usuario ve sus propios permisos
-- El admin (verificado por NestJS) puede ver los de su organización
CREATE POLICY "org_isolation" ON user_permissions
  FOR ALL USING (
    user_id IN (
      SELECT id FROM users
      WHERE organization_id = public.jwt_organization_id()
    )
  );

-- ------------------------------------------------------------
-- Permisos iniciales del superusuario (admin@laboratorio.com)
-- Se le otorgan TODOS los permisos disponibles.
-- granted_by apunta a sí mismo porque es el primer usuario.
-- ------------------------------------------------------------
DO $$
DECLARE
  v_admin_id uuid := '00000000-0000-0000-0000-000000000100';
  v_perm     record;
BEGIN
  FOR v_perm IN SELECT id FROM permissions LOOP
    INSERT INTO user_permissions (user_id, permission_id, granted, granted_by)
    VALUES (v_admin_id, v_perm.id, true, v_admin_id)
    ON CONFLICT (user_id, permission_id) DO NOTHING;
  END LOOP;
END;
$$;

COMMENT ON TABLE user_permissions IS
  'Permisos granulares por usuario. El superusuario (seed 009) tiene todos los permisos al crearse.';
