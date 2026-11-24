-- ============================================================
-- MIGRACIÓN 012: Validación y Trazabilidad de Portadosímetro en Asignación
--
-- 1. Vinculación de holder_id en dosimeter_assignments (ISO 17025)
-- 2. Soporte de ensamble directo de dosimeters en holder_tld_assemblies
-- 3. Vista enriquecida dosimeters_assembly_view
-- ============================================================

BEGIN;

-- 1. Agregar holder_id a dosimeter_assignments para trazabilidad de campo
ALTER TABLE dosimeter_assignments
  ADD COLUMN IF NOT EXISTS holder_id uuid REFERENCES holder_dosimeters(id);

COMMENT ON COLUMN dosimeter_assignments.holder_id IS 'Portadosímetro físico con el que fue entregado el dosímetro al trabajador POE.';

CREATE INDEX IF NOT EXISTS idx_dosimeter_assignments_holder ON dosimeter_assignments(holder_id);

-- 2. Permitir que holder_tld_assemblies ensamble directamente registros de dosimeters
ALTER TABLE holder_tld_assemblies
  ADD COLUMN IF NOT EXISTS dosimeter_id uuid REFERENCES dosimeters(id),
  ALTER COLUMN tld_card_id DROP NOT NULL;

COMMENT ON COLUMN holder_tld_assemblies.dosimeter_id IS 'Dosímetro físico del inventario general acoplado en este ensamble.';

-- Índice único parcial: un dosímetro solo puede tener un ensamble activo
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_dosimeter_assembly 
  ON holder_tld_assemblies (dosimeter_id) WHERE is_active = true;

-- 3. Actualizar vista unificada de ensamble (Drop previo para permitir nuevo esquema de columnas)
DROP VIEW IF EXISTS dosimeters_assembly_view;

CREATE VIEW dosimeters_assembly_view AS
SELECT 
  d.id AS dosimeter_id,
  d.serial_number AS dosimeter_serial,
  d.status_id,
  h.id AS holder_id,
  h.barcode AS holder_barcode,
  h.serial_number AS holder_serial,
  h.current_condition AS holder_condition,
  h.status AS holder_status,
  h.holder_color,
  h.clip_type,
  a.id AS assembly_id,
  a.assembled_at,
  (a.id IS NOT NULL AND a.is_active = true) AS is_assembled
FROM dosimeters d
LEFT JOIN holder_tld_assemblies a ON (
  a.dosimeter_id = d.id 
  OR a.holder_id IN (SELECT id FROM holder_dosimeters WHERE serial_number = d.serial_number)
) AND a.is_active = true
LEFT JOIN holder_dosimeters h ON h.id = a.holder_id;

COMMENT ON VIEW dosimeters_assembly_view IS 'Vista puente para consultar el ensamble activo de cada dosímetro con su portadosímetro correspondiente.';

COMMIT;
