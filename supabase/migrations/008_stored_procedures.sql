-- ============================================================
-- MIGRACIÓN 008 — Funciones y procedimientos almacenados
-- Transacciones atómicas llamadas desde NestJS via RPC.
-- Supabase expone estas funciones como endpoints REST
-- automáticamente: POST /rest/v1/rpc/{nombre_funcion}
--
-- CAMBIO: dosimeters ya no tiene client_id.
-- fn_get_dosimeter_history ya no hace JOIN con clients
-- a través de dosimeters. El cliente se obtiene a través
-- de la asignación → worker → client.
-- ============================================================

-- ------------------------------------------------------------
-- fn_assign_dosimeter
-- Transacción atómica de asignación de dosímetro.
-- 1. Verifica que no exista asignación abierta
-- 2. Crea el dosimeter_assignment
-- 3. Actualiza dosimeters.status_id a ASIGNADO
-- Sin cambios — no dependía de client_id en dosimeters.
-- Llamada desde: AssignDosimeterUseCase en NestJS
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_assign_dosimeter(
  p_dosimeter_id  uuid,
  p_worker_id     uuid,
  p_assigned_at   date,
  p_notes         text DEFAULT NULL
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
  INSERT INTO dosimeter_assignments (dosimeter_id, worker_id, assigned_at, notes, status)
  VALUES (p_dosimeter_id, p_worker_id, p_assigned_at, p_notes, 'activo')
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
-- Sin cambios — no dependía de client_id en dosimeters.
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
-- Sin cambios — no dependía de client_id en dosimeters.
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
--
-- CAMBIO: eliminado JOIN con clients a través de dosimeters.
-- El cliente actual se obtiene de la última asignación abierta
-- → worker → client. Si no hay asignación abierta, el campo
-- 'current_client' retorna null (dosímetro en laboratorio
-- o disponible sin asignar).
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
  -- Sin JOIN a clients — el cliente se infiere por assignments
  SELECT jsonb_build_object(
    'id',                d.id,
    'serial_number',     d.serial_number,
    'internal_code',     d.internal_code,
    'type',              dt.name,
    'technology',        dt.technology,
    'status',            ds.name,
    'status_code',       ds.code,
    'current_condition', d.current_condition,
    'lot_number',        d.lot_number,
    'commissioning_date', d.commissioning_date,
    'reusable',          d.reusable,
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

COMMENT ON FUNCTION fn_get_dosimeter_history IS 'Historial completo de un dosímetro. Cliente se obtiene por assignments, no por FK directa.';
