-- ============================================================
-- MIGRACIÓN 006 — RLS (Row Level Security) y Stored Procedures
--
-- Consolida: 007 (funciones JWT + RLS base), 008 (stored procedures),
--            015 (hash del admin), 016 (corrección RLS dosimeters/readings),
--            017 (default-deny tablas sin política)
--
-- ORDEN DE SECCIONES:
--   1. Funciones auxiliares JWT (requeridas por las políticas RLS)
--   2. Habilitar RLS en todas las tablas
--   3. Políticas RLS (con correcciones de 016 incorporadas)
--   4. Stored Procedures (transacciones atómicas de negocio)
-- ============================================================

-- ============================================================
-- SECCIÓN 1 — FUNCIONES AUXILIARES JWT
-- NestJS inyecta estas claims en el JWT. Las funciones las
-- extraen para usarlas en las políticas RLS.
-- NOTA: viven en schema public (no auth) porque en Supabase
-- self-hosted las migraciones no tienen permisos sobre schema auth.
-- ============================================================

CREATE OR REPLACE FUNCTION public.jwt_organization_id()
RETURNS uuid AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb ->> 'organization_id',
    NULL
  )::uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.jwt_organization_id IS 'Extrae organization_id del JWT. Usada por las políticas RLS.';

CREATE OR REPLACE FUNCTION public.jwt_user_id()
RETURNS uuid AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb ->> 'user_id',
    NULL
  )::uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.jwt_user_id IS 'Extrae user_id del JWT. Usada por las políticas RLS.';

CREATE OR REPLACE FUNCTION public.jwt_active_role()
RETURNS text AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb ->> 'active_role',
    NULL
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.jwt_active_role IS 'Extrae el rol activo del JWT. Usada por las políticas RLS de audit_logs.';

-- ============================================================
-- SECCIÓN 2 — HABILITAR RLS EN TODAS LAS TABLAS
-- ============================================================

-- Catálogos e infraestructura
ALTER TABLE organizations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE dosimeter_types        ENABLE ROW LEVEL SECURITY;
ALTER TABLE dosimeter_statuses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_definitions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_steps          ENABLE ROW LEVEL SECURITY;
ALTER TABLE laboratory_sites       ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_records       ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment              ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_calibrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_maintenance  ENABLE ROW LEVEL SECURITY;
ALTER TABLE environmental_records  ENABLE ROW LEVEL SECURITY;

-- Clientes, trabajadores, dosímetros
ALTER TABLE clients                ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_locations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE dosimeters             ENABLE ROW LEVEL SECURITY;
ALTER TABLE dosimeter_assignments  ENABLE ROW LEVEL SECURITY;

-- Órdenes, recepciones, lotes
ALTER TABLE service_orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE receptions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE reception_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_batches            ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_items            ENABLE ROW LEVEL SECURITY;

-- Procesos, lecturas, QC
ALTER TABLE process_executions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_execution_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE contamination_checks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_cycles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE dosimeter_readings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_records             ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_reports       ENABLE ROW LEVEL SECURITY;

-- Sistema documental y seguridad
ALTER TABLE documents              ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE attached_documents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens         ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SECCIÓN 3 — POLÍTICAS RLS
-- Principio: cada organización solo ve y modifica sus propios datos.
-- NestJS usa service_role_key (bypassa RLS) para todas las
-- operaciones del backend. Las políticas protegen acceso directo
-- a PostgREST con anon/authenticated key.
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

-- dosimeters: política corregida (migración 016).
-- El laboratorio (type='laboratory') ve TODOS los dosímetros
-- del inventario. Una organización cliente solo ve dosímetros
-- alguna vez asignados a sus propios trabajadores.
CREATE POLICY "org_isolation" ON dosimeters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = public.jwt_organization_id()
        AND o.type = 'laboratory'
    )
    OR id IN (
      SELECT da.dosimeter_id
      FROM dosimeter_assignments da
      JOIN workers w ON w.id = da.worker_id
      JOIN clients c ON c.id = w.client_id
      WHERE c.organization_id = public.jwt_organization_id()
    )
  );

COMMENT ON POLICY "org_isolation" ON dosimeters
  IS 'El laboratorio ve todo el inventario. Una organización cliente solo ve dosímetros alguna vez asignados a sus propios trabajadores.';

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

-- dosimeter_readings: política corregida (migración 016).
-- Laboratorio ve todas las lecturas. Cliente solo ve lecturas
-- de dosímetros alguna vez asignados a sus workers.
CREATE POLICY "org_isolation" ON dosimeter_readings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = public.jwt_organization_id()
        AND o.type = 'laboratory'
    )
    OR dosimeter_id IN (
      SELECT da.dosimeter_id
      FROM dosimeter_assignments da
      JOIN workers w ON w.id = da.worker_id
      JOIN clients c ON c.id = w.client_id
      WHERE c.organization_id = public.jwt_organization_id()
    )
  );

COMMENT ON POLICY "org_isolation" ON dosimeter_readings
  IS 'El laboratorio ve todas las lecturas. Una organización cliente solo ve lecturas de dosímetros alguna vez asignados a sus propios trabajadores.';

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

-- permissions: cualquier usuario autenticado puede leer el catálogo
CREATE POLICY "authenticated_read" ON permissions
  FOR SELECT USING (public.jwt_organization_id() IS NOT NULL);

-- user_permissions: cada usuario ve los de su organización
CREATE POLICY "org_isolation" ON user_permissions
  FOR ALL USING (
    user_id IN (
      SELECT id FROM users
      WHERE organization_id = public.jwt_organization_id()
    )
  );

-- refresh_tokens: cada usuario ve solo sus propios tokens
CREATE POLICY "owner_only" ON refresh_tokens
  FOR ALL USING (
    user_id IN (
      SELECT id FROM users
      WHERE organization_id = public.jwt_organization_id()
    )
  );

-- Tablas con RLS habilitado pero sin política permisiva (default-deny).
-- NestJS con service_role_key bypassa RLS. La postura es conservadora
-- hasta que los módulos de lab_process y reports definan sus reglas
-- de visibilidad cruzada cliente-laboratorio.
-- (Tablas afectadas: roles, dosimeter_types, dosimeter_statuses,
--  process_definitions, process_steps, equipment_maintenance,
--  environmental_records, process_execution_items, contamination_checks,
--  cleaning_cycles, qc_records, documents, document_versions, attached_documents)

-- ============================================================
-- SECCIÓN 4 — STORED PROCEDURES
-- Transacciones atómicas llamadas desde NestJS via RPC.
-- Supabase las expone como: POST /rest/v1/rpc/{nombre_funcion}
-- ============================================================

-- ------------------------------------------------------------
-- fn_assign_dosimeter
-- Transacción atómica de asignación de dosímetro.
-- 1. Verifica que no exista asignación abierta
-- 2. Crea el dosimeter_assignment
-- 3. Actualiza dosimeters.status_id a ASIGNADO
-- Llamada desde: AssignDosimeterUseCase en NestJS
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_assign_dosimeter(
  p_dosimeter_id  uuid,
  p_worker_id     uuid,
  p_assigned_at   date,
  p_notes         text DEFAULT NULL,
  p_assigned_by   uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_open_assignment uuid;
  v_status_asignado uuid;
  v_assignment_id   uuid;
BEGIN
  -- Verificar que no haya asignación abierta
  SELECT id INTO v_open_assignment
  FROM dosimeter_assignments
  WHERE dosimeter_id = p_dosimeter_id
    AND returned_at IS NULL
  LIMIT 1;

  IF v_open_assignment IS NOT NULL THEN
    RAISE EXCEPTION 'DOSIMETER_ALREADY_ASSIGNED'
      USING HINT = 'El dosímetro ya tiene una asignación abierta',
            ERRCODE = '23505';
  END IF;

  -- Obtener el status_id de ASIGNADO
  SELECT id INTO v_status_asignado
  FROM dosimeter_statuses
  WHERE code = 'ASIGNADO';

  -- Crear la asignación
  INSERT INTO dosimeter_assignments (dosimeter_id, worker_id, assigned_at, notes, status, assigned_by)
  VALUES (p_dosimeter_id, p_worker_id, p_assigned_at, p_notes, 'activo', p_assigned_by)
  RETURNING id INTO v_assignment_id;

  -- Actualizar el estado del dosímetro
  UPDATE dosimeters
  SET status_id = v_status_asignado
  WHERE id = p_dosimeter_id;

  RETURN jsonb_build_object(
    'assignment_id', v_assignment_id,
    'dosimeter_id',  p_dosimeter_id,
    'worker_id',     p_worker_id,
    'assigned_at',   p_assigned_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION fn_assign_dosimeter IS 'Asignación atómica de dosímetro. Llamada desde AssignDosimeterUseCase en NestJS.';

-- ------------------------------------------------------------
-- fn_return_dosimeter
-- Transacción atómica de devolución de dosímetro.
-- Llamada desde: ReturnDosimeterUseCase en NestJS
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_return_dosimeter(
  p_dosimeter_id  uuid,
  p_returned_at   date
)
RETURNS jsonb AS $$
DECLARE
  v_assignment_id     uuid;
  v_status_disponible uuid;
BEGIN
  -- Buscar la asignación abierta
  SELECT id INTO v_assignment_id
  FROM dosimeter_assignments
  WHERE dosimeter_id = p_dosimeter_id
    AND returned_at IS NULL
  LIMIT 1;

  IF v_assignment_id IS NULL THEN
    RAISE EXCEPTION 'NO_OPEN_ASSIGNMENT'
      USING HINT = 'El dosímetro no tiene una asignación abierta',
            ERRCODE = '02000';
  END IF;

  -- Obtener el status_id de DISPONIBLE
  SELECT id INTO v_status_disponible
  FROM dosimeter_statuses
  WHERE code = 'DISPONIBLE';

  -- Cerrar la asignación
  UPDATE dosimeter_assignments
  SET returned_at = p_returned_at,
      status      = 'cerrado'
  WHERE id = v_assignment_id;

  -- Actualizar el estado del dosímetro
  UPDATE dosimeters
  SET status_id = v_status_disponible
  WHERE id = p_dosimeter_id;

  RETURN jsonb_build_object(
    'assignment_id', v_assignment_id,
    'dosimeter_id',  p_dosimeter_id,
    'returned_at',   p_returned_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION fn_return_dosimeter IS 'Devolución atómica de dosímetro. Llamada desde ReturnDosimeterUseCase en NestJS.';

-- ------------------------------------------------------------
-- fn_create_lab_batch
-- Crea un lote de laboratorio y mueve dosímetros a EN_LAB.
-- Llamada desde: CreateLabBatchUseCase en NestJS
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_create_lab_batch(
  p_service_order_id uuid,
  p_reception_id     uuid,
  p_batch_code       text,
  p_batch_type       text,
  p_dosimeter_ids    uuid[]
)
RETURNS jsonb AS $$
DECLARE
  v_batch_id      uuid;
  v_status_en_lab uuid;
  v_dosimeter_id  uuid;
BEGIN
  -- Obtener el status_id de EN_LAB
  SELECT id INTO v_status_en_lab
  FROM dosimeter_statuses
  WHERE code = 'EN_LAB';

  -- Crear el lote
  INSERT INTO lab_batches (service_order_id, reception_id, batch_code, batch_type, status)
  VALUES (p_service_order_id, p_reception_id, p_batch_code, p_batch_type, 'FORMADO')
  RETURNING id INTO v_batch_id;

  -- Insertar cada dosímetro en el lote y actualizar su estado
  FOREACH v_dosimeter_id IN ARRAY p_dosimeter_ids LOOP
    INSERT INTO batch_items (lab_batch_id, dosimeter_id, status)
    VALUES (v_batch_id, v_dosimeter_id, 'PENDIENTE');

    UPDATE dosimeters
    SET status_id = v_status_en_lab
    WHERE id = v_dosimeter_id;
  END LOOP;

  RETURN jsonb_build_object(
    'batch_id',        v_batch_id,
    'batch_code',      p_batch_code,
    'dosimeter_count', array_length(p_dosimeter_ids, 1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION fn_create_lab_batch IS 'Crea un lote y mueve dosímetros a EN_LAB atómicamente. Llamada desde CreateLabBatchUseCase.';

-- ------------------------------------------------------------
-- fn_get_dosimeter_history
-- Reconstruye el historial completo de un dosímetro.
-- El cliente se infiere desde la última asignación abierta
-- → worker → client (no hay FK directa de dosimeters a clients).
-- Llamada desde: DosimeterHistoryUseCase en NestJS
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_get_dosimeter_history(
  p_dosimeter_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_dosimeter      jsonb;
  v_assignments    jsonb;
  v_readings       jsonb;
  v_contaminations jsonb;
BEGIN
  -- Datos base del dosímetro
  SELECT jsonb_build_object(
    'id',                d.id,
    'serial_number',     d.serial_number,
    'internal_code',     d.internal_code,
    'model',             d.model,
    'manufacturer',      d.manufacturer,
    'type',              dt.name,
    'technology',        dt.technology,
    'status',            ds.name,
    'status_code',       ds.code,
    'current_condition', d.current_condition,
    'lot_number',        d.lot_number,
    'commissioning_date', d.commissioning_date,
    'reusable',          d.reusable,
    'photo_url',         d.photo_url,
    -- Cliente actual: viene de la asignación abierta si existe
    'current_client', (
      SELECT c.name
      FROM dosimeter_assignments da
      JOIN workers w ON w.id = da.worker_id
      JOIN clients c ON c.id = w.client_id
      WHERE da.dosimeter_id = p_dosimeter_id
        AND da.returned_at IS NULL
      LIMIT 1
    ),
    -- Trabajador actual
    'current_worker', (
      SELECT w.full_name
      FROM dosimeter_assignments da
      JOIN workers w ON w.id = da.worker_id
      WHERE da.dosimeter_id = p_dosimeter_id
        AND da.returned_at IS NULL
      LIMIT 1
    )
  ) INTO v_dosimeter
  FROM dosimeters d
  JOIN dosimeter_types    dt ON dt.id = d.dosimeter_type_id
  JOIN dosimeter_statuses ds ON ds.id = d.status_id
  WHERE d.id = p_dosimeter_id;

  -- Historial completo de asignaciones con cliente
  SELECT jsonb_agg(jsonb_build_object(
    'worker',      w.full_name,
    'client',      c.name,
    'location',    cl.name,
    'assigned_at', da.assigned_at,
    'returned_at', da.returned_at,
    'status',      da.status
  ) ORDER BY da.assigned_at DESC)
  INTO v_assignments
  FROM dosimeter_assignments da
  JOIN workers           w  ON w.id  = da.worker_id
  JOIN clients           c  ON c.id  = w.client_id
  LEFT JOIN client_locations cl ON cl.id = w.client_location_id
  WHERE da.dosimeter_id = p_dosimeter_id;

  -- Lecturas de dosis
  SELECT jsonb_agg(jsonb_build_object(
    'read_at',       dr.read_at,
    'measured_dose', dr.measured_dose,
    'dose_unit',     dr.dose_unit,
    'uncertainty',   dr.uncertainty,
    'hp10',          dr.hp10,
    'hp007',         dr.hp007,
    'background_dose', dr.background_dose,
    'period_start',  dr.period_start,
    'period_end',    dr.period_end,
    'status',        dr.reading_status,
    'equipment',     e.name
  ) ORDER BY dr.read_at DESC)
  INTO v_readings
  FROM dosimeter_readings dr
  LEFT JOIN equipment e ON e.id = dr.equipment_id
  WHERE dr.dosimeter_id = p_dosimeter_id;

  -- Chequeos de contaminación
  SELECT jsonb_agg(jsonb_build_object(
    'checked_at',     cc.checked_at,
    'result',         cc.result,
    'measured_value', cc.measured_value,
    'unit',           cc.unit
  ) ORDER BY cc.checked_at DESC)
  INTO v_contaminations
  FROM contamination_checks cc
  WHERE cc.dosimeter_id = p_dosimeter_id;

  RETURN jsonb_build_object(
    'dosimeter',      v_dosimeter,
    'assignments',    COALESCE(v_assignments,    '[]'::jsonb),
    'readings',       COALESCE(v_readings,       '[]'::jsonb),
    'contaminations', COALESCE(v_contaminations, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION fn_get_dosimeter_history IS 'Historial completo de un dosímetro. Incluye model/manufacturer/photo_url. Cliente se obtiene por assignments, no por FK directa.';
