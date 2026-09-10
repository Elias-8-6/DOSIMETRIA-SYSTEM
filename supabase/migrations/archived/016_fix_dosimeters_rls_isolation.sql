-- ============================================================
-- MIGRACIÓN 016 — Corrección de aislamiento RLS en dosimeters
-- y dosimeter_readings.
--
-- HALLAZGO: las políticas "org_isolation" originales (007) solo
-- exigían `jwt_organization_id() IS NOT NULL`, es decir,
-- cualquier organización autenticada (incluida cualquier
-- organización cliente) podía leer/modificar TODOS los
-- dosímetros y TODAS las lecturas de dosis del sistema, sin
-- importar a qué cliente pertenecen. Si alguna vez PostgREST
-- queda expuesto directamente (o se filtra la anon/authenticated
-- key), una institución cliente podría ver la dosimetría de
-- otra institución cliente.
--
-- CORRECCIÓN: dosimeters es un activo del laboratorio (no tiene
-- FK a clients), así que:
--   - Una organización tipo 'laboratory' ve todos los dosímetros
--     y lecturas (administra el inventario completo).
--   - Una organización tipo 'client' solo ve dosímetros/lecturas
--     vinculados a sus propios trabajadores, vía
--     dosimeter_assignments → workers → clients.organization_id
--     (mismo patrón de join ya usado en la política de
--     dosimeter_assignments en 007).
-- ============================================================

DROP POLICY IF EXISTS "org_isolation" ON dosimeters;
DROP POLICY IF EXISTS "org_isolation" ON dosimeter_readings;

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
