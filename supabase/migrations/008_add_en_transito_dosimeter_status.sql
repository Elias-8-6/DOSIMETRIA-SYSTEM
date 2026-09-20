-- ============================================================
-- MIGRACIÓN 008 — Estado EN_TRANSITO para dosímetros
--
-- Agrega el estado 'EN_TRANSITO' al catálogo dosimeter_statuses.
-- Se utiliza para dosímetros que han sido incluidos en una orden
-- de servicio y viajan desde las instalaciones del cliente hacia
-- el laboratorio, antes de su recepción física formal (ISO 17025).
-- ============================================================

INSERT INTO dosimeter_statuses (code, name)
VALUES ('EN_TRANSITO', 'En tránsito hacia laboratorio')
ON CONFLICT (code) DO NOTHING;
