-- ============================================================
-- MIGRACIÓN 019 — Inmutabilidad real de registros históricos
-- críticos: dosimeter_readings, qc_records, audit_logs.
--
-- HALLAZGO MÁS CRÍTICO de la revisión de retención a 70 años:
-- nada en el schema impedía UPDATE/DELETE sobre una lectura de
-- dosis, un control de calidad o una entrada de auditoría ya
-- registrada. audit_logs incluso decía en su comentario "NO se
-- actualiza ni se borra — solo INSERT", pero eso era solo texto:
-- la garantía dependía 100% de que NestJS nunca ejecutara esas
-- operaciones, para siempre, sin excepción, en un sistema
-- pensado para sobrevivir cambios de framework y de personal
-- durante décadas.
--
-- Esta migración hace que las tres tablas sean estrictamente
-- append-only a nivel de base de datos: cualquier UPDATE o
-- DELETE (incluso ejecutado con service_role_key desde NestJS)
-- se rechaza con una excepción.
-- ============================================================

CREATE OR REPLACE FUNCTION public.reject_update_or_delete()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION
    'La tabla % es append-only: no se permite UPDATE ni DELETE sobre registros ya insertados (operación: %).',
    TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.reject_update_or_delete IS 'Bloquea UPDATE/DELETE en tablas append-only. Usada por dosimeter_readings, qc_records y audit_logs.';

CREATE TRIGGER trg_dosimeter_readings_immutable
  BEFORE UPDATE OR DELETE ON dosimeter_readings
  FOR EACH ROW EXECUTE FUNCTION public.reject_update_or_delete();

CREATE TRIGGER trg_qc_records_immutable
  BEFORE UPDATE OR DELETE ON qc_records
  FOR EACH ROW EXECUTE FUNCTION public.reject_update_or_delete();

CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.reject_update_or_delete();

-- Nota para quien necesite corregir una lectura errónea: el patrón
-- correcto es INSERT de un nuevo registro que anule/reemplace al
-- anterior (ej. reading_status = 'invalido' en el original + una
-- nueva lectura), nunca UPDATE. Esto preserva el historial completo
-- para auditoría ISO 17025 y para reconstrucción a largo plazo.
