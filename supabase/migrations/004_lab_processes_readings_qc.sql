-- ============================================================
-- MIGRACIÓN 004 — Procesos de laboratorio, lecturas y QC
--
-- Consolida: 005, 013 (dosimeter_readings/incident_reports),
--            019 (triggers inmutabilidad), 020 (created_at en
--            process_executions/qc_records), 021 (particionado
--            dosimeter_readings), 022 (índices), 023 (restaurar
--            hp10/hp007/background_dose), 027 (CHECK constraints)
--
-- CORRECCIÓN CRÍTICA:
--   La migración 021 recreó dosimeter_readings y omitió
--   period_start y period_end (añadidas en 013). La migración 023
--   restauró hp10/hp007/background_dose pero NO period_start/period_end.
--   Esta migración define la tabla completa desde el inicio,
--   incluyendo TODAS las columnas correctamente.
-- ============================================================

-- ------------------------------------------------------------
-- Función de inmutabilidad (de migración 019)
-- Bloquea UPDATE/DELETE en tablas append-only.
-- Debe existir antes de crear los triggers.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_update_or_delete()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION
    'La tabla % es append-only: no se permite UPDATE ni DELETE sobre registros ya insertados (operación: %).',
    TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.reject_update_or_delete IS 'Bloquea UPDATE/DELETE en tablas append-only. Usada por dosimeter_readings, qc_records y audit_logs.';

-- ------------------------------------------------------------
-- process_executions
-- Registro de cada vez que se ejecuta un paso de proceso sobre
-- un lote. Es el corazón de la trazabilidad ISO 17025.
-- Incluye created_at de migración 020.
-- ------------------------------------------------------------
CREATE TABLE process_executions (
  id               uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  lab_batch_id     uuid        NOT NULL REFERENCES lab_batches (id),
  process_step_id  uuid        NOT NULL REFERENCES process_steps (id),
  executed_by      uuid        NOT NULL REFERENCES users (id),
  verified_by      uuid        REFERENCES users (id),
  equipment_id     uuid        REFERENCES equipment (id),
  area_id          uuid        REFERENCES areas (id),
  started_at       timestamptz,
  finished_at      timestamptz,
  status           text        NOT NULL DEFAULT 'EN_CURSO' CHECK (status IN (
                     'EN_CURSO', 'COMPLETADO', 'FALLIDO', 'CANCELADO'
                   )),
  parameters       jsonb,
  results          jsonb,
  observations     text,
  -- campo de trazabilidad temporal (migración 020)
  created_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  process_executions            IS 'Ejecuciones de pasos de proceso sobre lotes. Núcleo de trazabilidad ISO 17025.';
COMMENT ON COLUMN process_executions.parameters  IS 'Parámetros de entrada del proceso (jsonb — estructura varía por tipo de proceso).';
COMMENT ON COLUMN process_executions.results     IS 'Resultados del proceso (jsonb — estructura varía por tipo de proceso).';
COMMENT ON COLUMN process_executions.verified_by IS 'Segundo usuario que verifica la ejecución. ISO 17025 puede requerir doble firma.';
COMMENT ON COLUMN process_executions.created_at  IS 'Fecha de registro de la ejecución. started_at/finished_at pueden ser NULL mientras el proceso está en curso; created_at nunca lo es.';

CREATE INDEX idx_process_executions_created ON process_executions (created_at DESC);

-- ------------------------------------------------------------
-- process_execution_items
-- Resultado a nivel de dosímetro individual dentro de una ejecución.
-- ------------------------------------------------------------
CREATE TABLE process_execution_items (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  process_execution_id uuid NOT NULL REFERENCES process_executions (id),
  dosimeter_id         uuid NOT NULL REFERENCES dosimeters (id),
  item_status          text NOT NULL DEFAULT 'PROCESADO' CHECK (item_status IN (
                         'PROCESADO', 'FALLIDO', 'INCIDENTE', 'EXCLUIDO'
                       )),
  item_results         jsonb,
  observations         text
);

COMMENT ON TABLE process_execution_items IS 'Resultado individual de cada dosímetro dentro de una ejecución de proceso.';

-- ------------------------------------------------------------
-- contamination_checks
-- Chequeos de contaminación sobre dosímetros individuales.
-- Se separa de process_execution_items porque tiene campos
-- específicos que necesitan consultarse y filtrarse directamente.
-- ------------------------------------------------------------
CREATE TABLE contamination_checks (
  id             uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  dosimeter_id   uuid        NOT NULL REFERENCES dosimeters (id),
  checked_at     timestamptz NOT NULL DEFAULT now(),
  checked_by     uuid        NOT NULL REFERENCES users (id),
  equipment_id   uuid        REFERENCES equipment (id),
  measured_value numeric,
  unit           text,
  result         text        NOT NULL CHECK (result IN (
                   'libre', 'contaminado_leve', 'contaminado_grave'
                 )),
  observations   text
);

COMMENT ON TABLE  contamination_checks       IS 'Chequeos de contaminación por dosímetro. Resultado contaminado bloquea el dosímetro.';
COMMENT ON COLUMN contamination_checks.result IS 'Si contaminado_*, NestJS actualiza dosimeter.current_condition y genera incident_report.';

CREATE INDEX idx_contamination_checks_dosimeter ON contamination_checks (dosimeter_id);

-- ------------------------------------------------------------
-- cleaning_cycles
-- Ciclos de limpieza aplicados a cada dosímetro.
-- Puede iterarse múltiples veces sobre el mismo dosímetro.
-- ------------------------------------------------------------
CREATE TABLE cleaning_cycles (
  id                   uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  dosimeter_id         uuid        NOT NULL REFERENCES dosimeters (id),
  process_execution_id uuid        REFERENCES process_executions (id),
  cycle_number         int         NOT NULL,
  cleaning_method      text        NOT NULL CHECK (cleaning_method IN (
                         'ultrasonido', 'quimico', 'mecanico', 'combinado'
                       )),
  started_at           timestamptz,
  finished_at          timestamptz,
  result               text        NOT NULL CHECK (result IN ('exitoso', 'requiere_reproceso', 'fallido'))
);

COMMENT ON TABLE  cleaning_cycles             IS 'Ciclos de limpieza por dosímetro. Un dosímetro puede requerir múltiples ciclos.';
COMMENT ON COLUMN cleaning_cycles.cycle_number IS 'Número secuencial del ciclo dentro del proceso de limpieza.';

-- ------------------------------------------------------------
-- dosimeter_readings
-- Medición de dosis de cada dosímetro.
-- ISO 17025: la lectura debe vincularse al equipo utilizado
-- (y su calibración vigente), al usuario y a la orden de servicio.
--
-- TABLA PARTICIONADA por RANGE sobre read_at (anual).
-- Con 70 años de retención regulatoria, es la tabla de mayor
-- crecimiento del sistema.
--
-- TRADE-OFF: la PK incluye read_at porque PostgreSQL lo exige en
-- tablas particionadas por rango. id (UUID) sigue siendo único
-- de facto. Ninguna otra tabla tiene FK hacia dosimeter_readings
-- (es tabla terminal), así que no rompe integridad referencial.
--
-- TODOS LOS CAMPOS incluidos desde el inicio:
--   - Campos base (005):          id, dosimeter_id, service_order_id,
--                                  equipment_id, read_at, measured_dose,
--                                  dose_unit, uncertainty, reading_status, raw_data
--   - Campos ISO (013):           hp10, hp007, background_dose,
--                                  period_start, period_end
--   - CHECK constraints (027):    measured_dose>=0, uncertainty>=0,
--                                  hp10>=0, hp007>=0, background_dose>=0
-- Nota: period_start/period_end fueron omitidas en la recreación
-- de 021 y nunca restauradas en 023 — se incluyen aquí correctamente.
-- ------------------------------------------------------------
CREATE TABLE dosimeter_readings (
  id               uuid        NOT NULL DEFAULT uuid_generate_v4(),
  dosimeter_id     uuid        NOT NULL REFERENCES dosimeters (id),
  service_order_id uuid        REFERENCES service_orders (id),
  equipment_id     uuid        REFERENCES equipment (id),
  read_at          timestamptz NOT NULL DEFAULT now(),
  measured_dose    numeric     NOT NULL,
  dose_unit        text        NOT NULL DEFAULT 'mSv' CHECK (dose_unit IN ('mSv', 'mGy', 'mR')),
  uncertainty      numeric,
  reading_status   text        NOT NULL DEFAULT 'valido' CHECK (reading_status IN (
                     'valido', 'sospechoso', 'invalido', 'fuera_rango'
                   )),
  raw_data         jsonb,
  -- Campos ISO estándar de dosis (migración 013, restaurados en 023)
  hp10             numeric,
  hp007            numeric,
  background_dose  numeric,
  -- Período de uso del dosímetro (migración 013, PERDIDO en 021, RESTAURADO aquí)
  period_start     date,
  period_end       date,
  -- CHECK constraints de rango (migración 027)
  CONSTRAINT dosimeter_readings_measured_dose_check   CHECK (measured_dose >= 0),
  CONSTRAINT dosimeter_readings_uncertainty_check     CHECK (uncertainty IS NULL OR uncertainty >= 0),
  CONSTRAINT dosimeter_readings_hp10_check            CHECK (hp10 IS NULL OR hp10 >= 0),
  CONSTRAINT dosimeter_readings_hp007_check           CHECK (hp007 IS NULL OR hp007 >= 0),
  CONSTRAINT dosimeter_readings_background_dose_check CHECK (background_dose IS NULL OR background_dose >= 0),
  PRIMARY KEY (id, read_at)
) PARTITION BY RANGE (read_at);

COMMENT ON TABLE  dosimeter_readings              IS 'Lecturas de dosis. ISO 17025 exige vincular cada lectura al equipo y su calibración vigente. Particionada por read_at (anual).';
COMMENT ON COLUMN dosimeter_readings.uncertainty   IS 'Incertidumbre de la medición. Requerida por ISO 17025 en el informe de resultados.';
COMMENT ON COLUMN dosimeter_readings.raw_data       IS 'Datos crudos del equipo lector. Preserva evidencia para auditorías.';
COMMENT ON COLUMN dosimeter_readings.hp10           IS 'Dosis equivalente cuerpo entero Hp(10) en mSv. Campo estándar ISO.';
COMMENT ON COLUMN dosimeter_readings.hp007          IS 'Dosis equivalente piel Hp(0.07) en mSv. Campo estándar ISO.';
COMMENT ON COLUMN dosimeter_readings.background_dose IS 'Dosis de fondo sustraída de la lectura bruta.';
COMMENT ON COLUMN dosimeter_readings.period_start    IS 'Inicio del período de uso del dosímetro.';
COMMENT ON COLUMN dosimeter_readings.period_end      IS 'Fin del período de uso del dosímetro.';

-- Particiones anuales 2025-2028 + red de seguridad DEFAULT
CREATE TABLE dosimeter_readings_2025    PARTITION OF dosimeter_readings FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE dosimeter_readings_2026    PARTITION OF dosimeter_readings FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE dosimeter_readings_2027    PARTITION OF dosimeter_readings FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');
CREATE TABLE dosimeter_readings_2028    PARTITION OF dosimeter_readings FOR VALUES FROM ('2028-01-01') TO ('2029-01-01');
CREATE TABLE dosimeter_readings_default PARTITION OF dosimeter_readings DEFAULT;

COMMENT ON TABLE dosimeter_readings_default IS 'Red de seguridad: recibe filas cuyo read_at cae fuera de las particiones anuales. Crear partición del año siguiente antes de que empiece.';

-- Índice compuesto para fn_get_dosimeter_history (filtra por dosimeter_id, ordena por read_at DESC)
CREATE INDEX idx_dosimeter_readings_dosimeter_read ON dosimeter_readings (dosimeter_id, read_at DESC);

COMMENT ON INDEX idx_dosimeter_readings_dosimeter_read IS 'Soporta fn_get_dosimeter_history (006): filtra por dosimeter_id, ordena por read_at DESC.';

-- Trigger de inmutabilidad
CREATE TRIGGER trg_dosimeter_readings_immutable
  BEFORE UPDATE OR DELETE ON dosimeter_readings
  FOR EACH ROW EXECUTE FUNCTION public.reject_update_or_delete();

-- ------------------------------------------------------------
-- qc_records
-- Controles de calidad asociados a ejecuciones de proceso.
-- ISO 17025: los controles de calidad son obligatorios en
-- procesos de medición.
-- Incluye created_at de migración 020.
-- ------------------------------------------------------------
CREATE TABLE qc_records (
  id                   uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  process_execution_id uuid        NOT NULL REFERENCES process_executions (id),
  qc_type              text        NOT NULL CHECK (qc_type IN (
                         'patron_referencia', 'blanco', 'duplicado',
                         'control_positivo', 'verificacion_equipo'
                       )),
  result               text        NOT NULL CHECK (result IN ('aprobado', 'rechazado', 'condicional')),
  value                numeric,
  unit                 text,
  acceptance_criteria  text        NOT NULL,
  observations         text,
  -- campo de trazabilidad temporal (migración 020)
  created_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  qc_records                    IS 'Controles de calidad por ejecución. ISO 17025 exige QC documentado en procesos de medición.';
COMMENT ON COLUMN qc_records.acceptance_criteria IS 'Criterio de aceptación aplicado. Ej: ±5% del valor de referencia.';
COMMENT ON COLUMN qc_records.created_at          IS 'Fecha de registro del control de calidad.';

CREATE INDEX idx_qc_records_created ON qc_records (created_at DESC);

-- Trigger de inmutabilidad — qc_records es append-only
CREATE TRIGGER trg_qc_records_immutable
  BEFORE UPDATE OR DELETE ON qc_records
  FOR EACH ROW EXECUTE FUNCTION public.reject_update_or_delete();

-- ------------------------------------------------------------
-- incident_reports
-- Registro de anomalías durante cualquier etapa del proceso.
-- Incluye campos de cierre y trazabilidad de migración 013.
-- ------------------------------------------------------------
CREATE TABLE incident_reports (
  id                   uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  process_execution_id uuid        REFERENCES process_executions (id),
  reported_by          uuid        NOT NULL REFERENCES users (id),
  incident_type        text        NOT NULL CHECK (incident_type IN (
                         'contaminacion', 'sello_roto', 'dosis_elevada',
                         'equipo_fuera_calibracion', 'error_procedimiento',
                         'perdida_dosimetro', 'otro'
                       )),
  severity             text        NOT NULL CHECK (severity IN ('baja', 'media', 'alta', 'critica')),
  status               text        NOT NULL DEFAULT 'ABIERTO' CHECK (status IN (
                         'ABIERTO', 'EN_INVESTIGACION', 'RESUELTO', 'CERRADO'
                       )),
  description          text        NOT NULL,
  reported_at          timestamptz NOT NULL DEFAULT now(),
  -- campos de cierre y trazabilidad (migración 013)
  dosimeter_id         uuid        REFERENCES dosimeters (id),
  resolved_by          uuid        REFERENCES users (id),
  resolved_at          timestamptz,
  corrective_action    text
);

COMMENT ON TABLE  incident_reports              IS 'Anomalías detectadas durante el proceso. Ciclo de vida propio independiente del proceso principal.';
COMMENT ON COLUMN incident_reports.dosimeter_id    IS 'Dosímetro involucrado en el incidente (si aplica).';
COMMENT ON COLUMN incident_reports.resolved_by     IS 'Usuario que resolvió el incidente.';
COMMENT ON COLUMN incident_reports.resolved_at     IS 'Fecha y hora de resolución del incidente.';
COMMENT ON COLUMN incident_reports.corrective_action IS 'Descripción de la acción correctiva tomada.';
