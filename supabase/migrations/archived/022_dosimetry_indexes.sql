-- ============================================================
-- MIGRACIÓN 022 — Índices faltantes en tablas de dosimetría
--
-- dosimeter_readings no tenía ningún índice más allá de la PK —
-- es la tabla que más va a consultarse (historial por dosímetro)
-- y la que más crecerá en 70 años. fn_get_dosimeter_history (008)
-- filtra por dosimeter_id y ordena por read_at DESC sin ningún
-- índice que lo soporte. Mismo problema en dosimeter_assignments
-- por worker_id, contamination_checks por dosimeter_id, y los
-- ítems de orden/recepción/lote por dosimeter_id.
-- ============================================================

CREATE INDEX idx_dosimeter_readings_dosimeter_read
  ON dosimeter_readings (dosimeter_id, read_at DESC);

CREATE INDEX idx_dosimeter_assignments_worker
  ON dosimeter_assignments (worker_id);

CREATE INDEX idx_contamination_checks_dosimeter
  ON contamination_checks (dosimeter_id);

CREATE INDEX idx_service_order_items_dosimeter
  ON service_order_items (dosimeter_id);

CREATE INDEX idx_reception_items_dosimeter
  ON reception_items (dosimeter_id);

CREATE INDEX idx_batch_items_dosimeter
  ON batch_items (dosimeter_id);

COMMENT ON INDEX idx_dosimeter_readings_dosimeter_read IS 'Soporta fn_get_dosimeter_history (008): filtra por dosimeter_id, ordena por read_at DESC.';
