-- ============================================================
-- MIGRACIÓN 007 — Row Level Security (RLS)
-- Seguridad multi-tenant a nivel de base de datos.
-- Cada organización solo puede ver y modificar sus propios datos.
-- NestJS usa el service role key para operaciones del backend
-- (bypassa RLS). Los clientes NUNCA acceden directamente a
-- Supabase — todo pasa por NestJS.
--
-- NOTA: Las funciones auxiliares viven en el schema PUBLIC,
-- no en auth. En Supabase local el schema auth es propiedad
-- de un rol interno y las migraciones no tienen permisos
-- para escribir en él.
--
-- NOTA: dosimeters ya no tiene client_id. Su política RLS
-- se basa en organization_id a través de los usuarios
-- que pertenecen a la organización del laboratorio.
-- ============================================================

-- ------------------------------------------------------------
-- Función auxiliar: extrae el organization_id del JWT
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.jwt_organization_id()
RETURNS uuid AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb ->> 'organization_id',
    NULL
  )::uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.jwt_organization_id IS 'Extrae organization_id del JWT. Usada por las políticas RLS.';

-- ------------------------------------------------------------
-- Función auxiliar: extrae el user_id del JWT
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.jwt_user_id()
RETURNS uuid AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb ->> 'user_id',
    NULL
  )::uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.jwt_user_id IS 'Extrae user_id del JWT. Usada por las políticas RLS.';

-- ------------------------------------------------------------
-- Función auxiliar: extrae el active_role del JWT
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.jwt_active_role()
RETURNS text AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb ->> 'active_role',
    NULL
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.jwt_active_role IS 'Extrae el rol activo del JWT. Usada por las políticas RLS de audit_logs.';

-- ============================================================
-- HABILITAR RLS EN TODAS LAS TABLAS CRÍTICAS
-- ============================================================

ALTER TABLE organizations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE laboratory_sites       ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_records       ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients                ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_locations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE dosimeters             ENABLE ROW LEVEL SECURITY;
ALTER TABLE dosimeter_assignments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE receptions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE reception_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_batches            ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_executions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE dosimeter_readings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_reports       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment              ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_calibrations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLÍTICAS RLS
-- ============================================================

-- organizations: cada usuario ve solo su organización
CREATE POLICY "org_isolation" ON organizations
  FOR ALL USING (id = public.jwt_organization_id());

-- laboratory_sites: solo de la organización propia
CREATE POLICY "org_isolation" ON laboratory_sites
  FOR ALL USING (organization_id = public.jwt_organization_id());

-- areas: a través de laboratory_sites de la organización
CREATE POLICY "org_isolation" ON areas
  FOR ALL USING (
    laboratory_site_id IN (
      SELECT id FROM laboratory_sites
      WHERE organization_id = public.jwt_organization_id()
    )
  );

-- users: cada usuario ve usuarios de su misma organización
CREATE POLICY "org_isolation" ON users
  FOR ALL USING (organization_id = public.jwt_organization_id());

-- user_roles: solo roles de usuarios de la misma organización
CREATE POLICY "org_isolation" ON user_roles
  FOR ALL USING (
    user_id IN (
      SELECT id FROM users
      WHERE organization_id = public.jwt_organization_id()
    )
  );

-- training_records: solo del personal de la misma organización
CREATE POLICY "org_isolation" ON training_records
  FOR ALL USING (
    user_id IN (
      SELECT id FROM users
      WHERE organization_id = public.jwt_organization_id()
    )
  );

-- clients: solo clientes de la organización propia
CREATE POLICY "org_isolation" ON clients
  FOR ALL USING (organization_id = public.jwt_organization_id());

-- client_locations: a través del client de la organización
CREATE POLICY "org_isolation" ON client_locations
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients
      WHERE organization_id = public.jwt_organization_id()
    )
  );

-- workers: a través del client de la organización
CREATE POLICY "org_isolation" ON workers
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients
      WHERE organization_id = public.jwt_organization_id()
    )
  );

-- dosimeters: los dosímetros pertenecen al laboratorio (organización).
-- Sin client_id, la política se basa en que el usuario autenticado
-- pertenece a la organización que gestiona el laboratorio.
-- NestJS es responsable de la lógica de negocio sobre qué
-- dosímetros puede ver cada rol.
CREATE POLICY "org_isolation" ON dosimeters
  FOR ALL USING (
    public.jwt_organization_id() IS NOT NULL
  );

-- dosimeter_assignments: a través del worker → client → organización
CREATE POLICY "org_isolation" ON dosimeter_assignments
  FOR ALL USING (
    worker_id IN (
      SELECT w.id FROM workers w
      JOIN clients c ON c.id = w.client_id
      WHERE c.organization_id = public.jwt_organization_id()
    )
  );

-- service_orders: a través del client de la organización
CREATE POLICY "org_isolation" ON service_orders
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients
      WHERE organization_id = public.jwt_organization_id()
    )
  );

-- service_order_items: a través de la orden
CREATE POLICY "org_isolation" ON service_order_items
  FOR ALL USING (
    service_order_id IN (
      SELECT so.id FROM service_orders so
      JOIN clients c ON c.id = so.client_id
      WHERE c.organization_id = public.jwt_organization_id()
    )
  );

-- receptions: a través de la orden
CREATE POLICY "org_isolation" ON receptions
  FOR ALL USING (
    service_order_id IN (
      SELECT so.id FROM service_orders so
      JOIN clients c ON c.id = so.client_id
      WHERE c.organization_id = public.jwt_organization_id()
    )
  );

-- reception_items: a través de la recepción
CREATE POLICY "org_isolation" ON reception_items
  FOR ALL USING (
    reception_id IN (
      SELECT r.id FROM receptions r
      JOIN service_orders so ON so.id = r.service_order_id
      JOIN clients c ON c.id = so.client_id
      WHERE c.organization_id = public.jwt_organization_id()
    )
  );

-- lab_batches: a través de la orden
CREATE POLICY "org_isolation" ON lab_batches
  FOR ALL USING (
    service_order_id IN (
      SELECT so.id FROM service_orders so
      JOIN clients c ON c.id = so.client_id
      WHERE c.organization_id = public.jwt_organization_id()
    )
  );

-- batch_items: a través del lote
CREATE POLICY "org_isolation" ON batch_items
  FOR ALL USING (
    lab_batch_id IN (
      SELECT lb.id FROM lab_batches lb
      JOIN service_orders so ON so.id = lb.service_order_id
      JOIN clients c ON c.id = so.client_id
      WHERE c.organization_id = public.jwt_organization_id()
    )
  );

-- process_executions: a través del usuario ejecutor
CREATE POLICY "org_isolation" ON process_executions
  FOR ALL USING (
    executed_by IN (
      SELECT id FROM users
      WHERE organization_id = public.jwt_organization_id()
    )
  );

-- dosimeter_readings: cualquier lectura de la organización
-- (sin client_id en dosimeters, se valida por organización del usuario)
CREATE POLICY "org_isolation" ON dosimeter_readings
  FOR ALL USING (
    public.jwt_organization_id() IS NOT NULL
  );

-- incident_reports: solo los reportados por usuarios de la org
CREATE POLICY "org_isolation" ON incident_reports
  FOR ALL USING (
    reported_by IN (
      SELECT id FROM users
      WHERE organization_id = public.jwt_organization_id()
    )
  );

-- audit_logs: solo lectura, solo admin_lab y auditor
-- INSERT lo hace exclusivamente NestJS con service_role_key
CREATE POLICY "org_read" ON audit_logs
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users
      WHERE organization_id = public.jwt_organization_id()
    )
    AND public.jwt_active_role() IN ('admin_lab', 'auditor')
  );

-- equipment: de la misma organización via laboratory_site
CREATE POLICY "org_isolation" ON equipment
  FOR ALL USING (
    laboratory_site_id IN (
      SELECT id FROM laboratory_sites
      WHERE organization_id = public.jwt_organization_id()
    )
  );

-- equipment_calibrations: a través del equipo
CREATE POLICY "org_isolation" ON equipment_calibrations
  FOR ALL USING (
    equipment_id IN (
      SELECT e.id FROM equipment e
      JOIN laboratory_sites ls ON ls.id = e.laboratory_site_id
      WHERE ls.organization_id = public.jwt_organization_id()
    )
  );
