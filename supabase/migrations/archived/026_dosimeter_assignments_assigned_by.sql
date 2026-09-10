-- ============================================================
-- MIGRACIÓN 025 — Trazabilidad de autoría en dosimeter_assignments
--
-- HALLAZGO: dosimeter_assignments no registraba quién realizó la
-- asignación de un dosímetro a un trabajador, a diferencia de
-- service_orders.created_by (agregado en 013). Es un evento que
-- puede terminar en litigio (ej. disputa sobre si un trabajador
-- realmente portó cierto dosímetro en cierto período) y hoy no
-- queda registrado el "quién" a nivel de schema.
-- ============================================================

ALTER TABLE dosimeter_assignments
  ADD COLUMN assigned_by uuid REFERENCES users (id);

COMMENT ON COLUMN dosimeter_assignments.assigned_by IS 'Usuario del laboratorio que registró la asignación. NULL permitido solo por compatibilidad con datos previos a esta columna.';
