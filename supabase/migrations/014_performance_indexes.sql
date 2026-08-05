-- ============================================================
-- MIGRACIÓN 014 — Índices de listados y filtros frecuentes
-- Optimiza queries multi-tenant de users, clients y workers.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_clients_org_name
  ON clients (organization_id, name);

CREATE INDEX IF NOT EXISTS idx_clients_org_status
  ON clients (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_users_org_created
  ON users (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_org_status
  ON users (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_workers_client
  ON workers (client_id);

CREATE INDEX IF NOT EXISTS idx_workers_location
  ON workers (client_location_id);

CREATE INDEX IF NOT EXISTS idx_client_locations_client
  ON client_locations (client_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_user
  ON user_roles (user_id);

COMMENT ON INDEX idx_clients_org_name IS 'Listado de clientes por organización ordenado por nombre.';
COMMENT ON INDEX idx_users_org_created IS 'Listado de usuarios por organización ordenado por creación.';
COMMENT ON INDEX idx_workers_client IS 'Filtro de trabajadores por cliente.';
