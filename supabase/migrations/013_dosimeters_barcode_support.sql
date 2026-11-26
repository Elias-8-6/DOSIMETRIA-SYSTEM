-- ============================================================
-- Migración 013: Soporte de Código de Barras en Dosímetros
-- ============================================================
-- Permite identificar dosímetros mediante código de barras
-- de escaneo físico (etiqueta Code-128 / QR) o autogenerado (DOS-YYYYMM-XXXX).
-- Backfill seguro: si barcode es NULL, se inicializa con serial_number.
-- ============================================================

ALTER TABLE dosimeters ADD COLUMN IF NOT EXISTS barcode text;

-- Backfill inicial: los dosímetros existentes usan su serial_number como barcode inicial
UPDATE dosimeters
SET barcode = serial_number
WHERE barcode IS NULL;

-- Restricción de unicidad e índice para búsquedas por pistola lectora (< 75ms)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dosimeters_barcode_key'
  ) THEN
    ALTER TABLE dosimeters ADD CONSTRAINT dosimeters_barcode_key UNIQUE (barcode);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_dosimeters_barcode ON dosimeters (barcode);

COMMENT ON COLUMN dosimeters.barcode IS 'Código de barras de lectura física o correlativo único autogenerado (DOS-YYYYMM-XXXX).';
