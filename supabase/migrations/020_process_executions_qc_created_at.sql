-- ============================================================
-- MIGRACIÓN 020 — created_at en process_executions y qc_records
--
-- HALLAZGO: ninguna de las dos tablas tenía ninguna columna de
-- timestamp propia (process_executions solo tiene started_at/
-- finished_at, ambas nullable; qc_records no tiene ninguna). No
-- se podía ni siquiera ordenar por fecha de creación, y son
-- justo las tablas que en 70 años de operación más crecerán.
--
-- Prerequisito para poder particionar estas tablas por rango de
-- fecha más adelante (no se particionan todavía en esta
-- migración: aún no hay volumen real que lo justifique — el
-- módulo de lab_process no está implementado).
-- ============================================================

ALTER TABLE process_executions
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE qc_records
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX idx_process_executions_created ON process_executions (created_at DESC);
CREATE INDEX idx_qc_records_created         ON qc_records (created_at DESC);

COMMENT ON COLUMN process_executions.created_at IS 'Fecha de registro de la ejecución. started_at/finished_at pueden ser NULL mientras el proceso está en curso; created_at nunca lo es.';
COMMENT ON COLUMN qc_records.created_at         IS 'Fecha de registro del control de calidad.';
