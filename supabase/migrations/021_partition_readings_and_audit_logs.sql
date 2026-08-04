-- ============================================================
-- MIGRACIÓN 021 — Particionar dosimeter_readings y audit_logs
-- por rango de fecha (anual).
--
-- Con 70 años de retención regulatoria, estas son las dos tablas
-- de crecimiento no acotado más grandes del sistema (una lectura
-- por dosímetro por período de uso, una entrada de auditoría por
-- cada acción crítica). Particionar ahora, con las tablas vacías,
-- es muchísimo más barato que hacerlo después con datos reales:
-- no hay que mover filas, solo recrear la estructura.
--
-- Ambas tablas se recrean como PARTITION BY RANGE sobre su columna
-- de fecha (read_at / created_at). Se agregan particiones anuales
-- 2025-2028 más una partición DEFAULT como red de seguridad para
-- cualquier fecha fuera de rango (evita que un INSERT falle si
-- nadie creó la partición del año correspondiente a tiempo).
--
-- TRADE-OFF DOCUMENTADO: en una tabla particionada por RANGE,
-- PostgreSQL exige que la PRIMARY KEY incluya la columna de
-- partición. Por eso la PK pasa de (id) a (id, read_at) /
-- (id, created_at) — id sigue siendo prácticamente único (UUID
-- generado aleatoriamente) pero ya no está protegido por un
-- constraint UNIQUE de una sola columna a nivel de motor. Ninguna
-- otra tabla tiene FK hacia dosimeter_readings ni audit_logs
-- (son tablas terminales), así que esto no rompe integridad
-- referencial existente.
--
-- Mantenimiento: crear la partición del año siguiente antes de
-- que empiece (ej. vía un job anual o al desplegar cada enero):
--   CREATE TABLE dosimeter_readings_2029 PARTITION OF dosimeter_readings
--     FOR VALUES FROM ('2029-01-01') TO ('2030-01-01');
-- ============================================================

-- ------------------------------------------------------------
-- dosimeter_readings
-- ------------------------------------------------------------

DROP TABLE dosimeter_readings CASCADE;

CREATE TABLE dosimeter_readings (
  id               uuid NOT NULL DEFAULT uuid_generate_v4(),
  dosimeter_id     uuid NOT NULL REFERENCES dosimeters (id),
  service_order_id uuid REFERENCES service_orders (id),
  equipment_id     uuid REFERENCES equipment (id),
  read_at          timestamptz NOT NULL DEFAULT now(),
  measured_dose    numeric NOT NULL,
  dose_unit        text NOT NULL DEFAULT 'mSv' CHECK (dose_unit IN ('mSv', 'mGy', 'mR')),
  uncertainty      numeric,
  reading_status   text NOT NULL DEFAULT 'valido' CHECK (reading_status IN (
                     'valido',
                     'sospechoso',
                     'invalido',
                     'fuera_rango'
                   )),
  raw_data         jsonb,
  PRIMARY KEY (id, read_at)
) PARTITION BY RANGE (read_at);

COMMENT ON TABLE  dosimeter_readings              IS 'Lecturas de dosis. ISO 17025 exige vincular cada lectura al equipo y su calibración vigente. Particionada por read_at (anual).';
COMMENT ON COLUMN dosimeter_readings.uncertainty   IS 'Incertidumbre de la medición. Requerida por ISO 17025 en el informe de resultados.';
COMMENT ON COLUMN dosimeter_readings.raw_data       IS 'Datos crudos del equipo lector. Preserva evidencia para auditorías.';

CREATE TABLE dosimeter_readings_2025   PARTITION OF dosimeter_readings FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE dosimeter_readings_2026   PARTITION OF dosimeter_readings FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE dosimeter_readings_2027   PARTITION OF dosimeter_readings FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');
CREATE TABLE dosimeter_readings_2028   PARTITION OF dosimeter_readings FOR VALUES FROM ('2028-01-01') TO ('2029-01-01');
CREATE TABLE dosimeter_readings_default PARTITION OF dosimeter_readings DEFAULT;

COMMENT ON TABLE dosimeter_readings_default IS 'Red de seguridad: recibe filas cuyo read_at cae fuera de las particiones anuales creadas. Revisar y mover a la partición correcta si esto ocurre.';

ALTER TABLE dosimeter_readings ENABLE ROW LEVEL SECURITY;

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

CREATE TRIGGER trg_dosimeter_readings_immutable
  BEFORE UPDATE OR DELETE ON dosimeter_readings
  FOR EACH ROW EXECUTE FUNCTION public.reject_update_or_delete();

-- ------------------------------------------------------------
-- audit_logs
-- ------------------------------------------------------------

DROP TABLE audit_logs CASCADE;

CREATE TABLE audit_logs (
  id           uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id      uuid REFERENCES users (id),
  active_role  text,
  entity_name  text NOT NULL,
  entity_id    uuid,
  action       text NOT NULL CHECK (action IN (
                 'CREATE',
                 'UPDATE',
                 'DELETE',
                 'STATUS_CHANGE',
                 'LOGIN',
                 'LOGIN_FAILED',
                 'LOGOUT',
                 'ROLE_SELECT'
               )),
  old_values   jsonb,
  new_values   jsonb,
  ip_address   inet,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

COMMENT ON TABLE  audit_logs             IS 'Log de auditoría inmutable. ISO 17025: trazabilidad completa de todas las acciones críticas. Particionada por created_at (anual).';
COMMENT ON COLUMN audit_logs.active_role  IS 'Rol con el que el usuario estaba operando al momento de la acción.';
COMMENT ON COLUMN audit_logs.old_values   IS 'Estado anterior de la entidad. NULL en acciones CREATE.';
COMMENT ON COLUMN audit_logs.new_values   IS 'Estado nuevo de la entidad. NULL en acciones DELETE.';
COMMENT ON COLUMN audit_logs.ip_address   IS 'IP de origen de la request. NULL en eventos que no vienen de un request HTTP directo.';
COMMENT ON COLUMN audit_logs.user_agent   IS 'User-Agent del cliente HTTP que originó el evento.';

CREATE TABLE audit_logs_2025   PARTITION OF audit_logs FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE audit_logs_2026   PARTITION OF audit_logs FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE audit_logs_2027   PARTITION OF audit_logs FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');
CREATE TABLE audit_logs_2028   PARTITION OF audit_logs FOR VALUES FROM ('2028-01-01') TO ('2029-01-01');
CREATE TABLE audit_logs_default PARTITION OF audit_logs DEFAULT;

COMMENT ON TABLE audit_logs_default IS 'Red de seguridad: recibe filas cuyo created_at cae fuera de las particiones anuales creadas.';

-- Índices que ya existían en 006, recreados sobre la tabla particionada
-- (CREATE INDEX en la tabla padre se propaga a cada partición).
CREATE INDEX idx_audit_logs_entity   ON audit_logs (entity_name, entity_id);
CREATE INDEX idx_audit_logs_user     ON audit_logs (user_id);
CREATE INDEX idx_audit_logs_created  ON audit_logs (created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_read" ON audit_logs
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users
      WHERE organization_id = public.jwt_organization_id()
    )
    AND public.jwt_active_role() IN ('admin_lab', 'auditor')
  );

CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.reject_update_or_delete();
