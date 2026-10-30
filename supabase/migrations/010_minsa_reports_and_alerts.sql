-- ============================================================
-- MIGRACIÓN 010 — Informes Oficiales Minsa y Trazabilidad ISO 17025
--
-- Añade la tabla official_reports para persistir informes técnicos
-- mensuales, consolidados anuales, historiales de vida laboral POE
-- (retención legal de 50 a 75 años) e informes urgentes de dosis crítica (>2.0 mSv).
-- Incorpora correlativo secuencial anual y hash criptográfico SHA-256.
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS seq_official_report_number START 1;

CREATE TABLE IF NOT EXISTS official_reports (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     uuid NOT NULL REFERENCES organizations (id),
  client_id           uuid NOT NULL REFERENCES clients (id),
  service_order_id    uuid REFERENCES service_orders (id),
  report_number       text UNIQUE NOT NULL, -- Ej: INF-MINSA-2026-00001 o INF-URG-2026-00001
  report_type         text NOT NULL CHECK (report_type IN (
                        'MENSUAL_CLIENTE',
                        'CONSOLIDADO_ANUAL',
                        'HISTORIAL_POE',
                        'URGENTE_DOSIS_EXCESIVA'
                      )),
  period_year         int NOT NULL,
  period_month        int CHECK (period_month IS NULL OR (period_month >= 1 AND period_month <= 12)),
  issued_at           timestamptz NOT NULL DEFAULT now(),
  issued_by           uuid NOT NULL REFERENCES users (id),
  content_data        jsonb NOT NULL, -- Datos estructurados inmutables del informe
  integrity_hash      text NOT NULL, -- Hash SHA-256 del content_data canónico
  status              text NOT NULL DEFAULT 'EMITIDO' CHECK (status IN ('EMITIDO', 'ANULADO')),
  voided_reason       text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE official_reports IS 'Informes técnicos dosimétricos emitidos bajo ISO/IEC 17025 y normativa Minsa. Inmutables mediante hash SHA-256.';
COMMENT ON COLUMN official_reports.report_number IS 'Correlativo oficial anual inalterable.';
COMMENT ON COLUMN official_reports.integrity_hash IS 'Firma criptográfica SHA-256 del contenido.';

CREATE INDEX IF NOT EXISTS idx_official_reports_org_client ON official_reports (organization_id, client_id);
CREATE INDEX IF NOT EXISTS idx_official_reports_period ON official_reports (period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_official_reports_type ON official_reports (report_type);

-- RLS
ALTER TABLE official_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "official_reports_organization_policy" ON official_reports;
CREATE POLICY "official_reports_organization_policy" ON official_reports
  FOR ALL
  USING (organization_id = public.jwt_organization_id())
  WITH CHECK (organization_id = public.jwt_organization_id());

-- Vista para alertas de dosis excesiva consolidadas con POE y cliente
CREATE OR REPLACE VIEW v_excessive_dose_alerts AS
SELECT
  dr.id AS reading_id,
  dr.read_at,
  dr.measured_dose,
  dr.hp10,
  dr.hp007,
  dr.background_dose,
  dr.reading_status,
  dr.period_start,
  dr.period_end,
  d.id AS dosimeter_id,
  d.serial_number AS dosimeter_serial,
  w.id AS worker_id,
  w.document_number AS worker_document_number,
  w.full_name AS worker_full_name,
  w.occupation AS worker_occupation,
  w.medical_status AS worker_medical_status,
  c.id AS client_id,
  c.name AS client_name,
  c.code AS client_code,
  c.address AS client_address,
  c.contact_name AS client_contact_name,
  ir.id AS incident_report_id,
  ir.status AS incident_status,
  ir.severity AS incident_severity,
  ir.description AS incident_description,
  eq.name AS equipment_name
FROM dosimeter_readings dr
JOIN dosimeters d ON dr.dosimeter_id = d.id
LEFT JOIN dosimeter_assignments da ON da.dosimeter_id = d.id 
  AND (da.assigned_at <= dr.read_at AND (da.returned_at IS NULL OR da.returned_at >= dr.read_at))
LEFT JOIN workers w ON da.worker_id = w.id
LEFT JOIN clients c ON w.client_id = c.id
LEFT JOIN incident_reports ir ON ir.dosimeter_id = d.id AND ir.incident_type = 'dosis_elevada'
LEFT JOIN equipment eq ON dr.equipment_id = eq.id
WHERE dr.is_alert_excessive_dose = true;

COMMENT ON VIEW v_excessive_dose_alerts IS 'Vista analítica para supervisión del OPR sobre lecturas críticas >2.0 mSv';
