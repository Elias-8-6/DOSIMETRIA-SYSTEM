-- ============================================================
-- MIGRACIÓN 007 — Metadatos de documentación física y trazabilidad ISO 17025
--
-- Permite personalizar los datos mostrados en los documentos impresos
-- (Formulario REPDOS-01 y Nota de Entrega de Mercancía), tales como
-- firmantes, cargos, número de lote, período dosimétrico, etc.
-- Cada cambio en este campo se registra en audit_logs para trazabilidad.
-- ============================================================

ALTER TABLE service_orders
ADD COLUMN IF NOT EXISTS document_data jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN service_orders.document_data IS 'Metadatos editables de documentación física oficial (firmas, cargos, lote, catálogo, acuse de recibo). Modificaciones auditadas bajo ISO 17025.';
