-- ============================================================
-- MIGRACIÓN 005 — Procesos de laboratorio, lecturas y QC
-- El núcleo técnico del sistema de trazabilidad.
-- Depende de: 001, 002, 003, 004
-- ============================================================

-- ------------------------------------------------------------
-- process_executions
-- Registro de cada vez que se ejecuta un paso de proceso
-- sobre un lote. Es el corazón de la trazabilidad ISO 17025:
-- quién lo hizo, con qué equipo, en qué área, cuándo,
-- y quién lo verificó.
-- ------------------------------------------------------------
CREATE TABLE process_executions (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  lab_batch_id     uuid NOT NULL REFERENCES lab_batches (id),
  process_step_id  uuid NOT NULL REFERENCES process_steps (id),
  executed_by      uuid NOT NULL REFERENCES users (id),
  verified_by      uuid REFERENCES users (id),
  equipment_id     uuid REFERENCES equipment (id),
  area_id          uuid REFERENCES areas (id),
  started_at       timestamptz,
  finished_at      timestamptz,
  status           text NOT NULL DEFAULT 'EN_CURSO' CHECK (status IN (
                     'EN_CURSO',
                     'COMPLETADO',
                     'FALLIDO',
                     'CANCELADO'
                   )),
  parameters       jsonb,
  results          jsonb,
  observations     text
);

COMMENT ON TABLE  process_executions          IS 'Ejecuciones de pasos de proceso sobre lotes. Núcleo de trazabilidad ISO 17025.';
COMMENT ON COLUMN process_executions.parameters IS 'Parámetros de entrada del proceso (jsonb — estructura varía por tipo de proceso).';
COMMENT ON COLUMN process_executions.results    IS 'Resultados del proceso (jsonb — estructura varía por tipo de proceso).';
COMMENT ON COLUMN process_executions.verified_by IS 'Segundo usuario que verifica la ejecución. ISO 17025 puede requerir doble firma.';

-- ------------------------------------------------------------
-- process_execution_items
-- Resultado a nivel de dosímetro individual dentro de una
-- ejecución. El proceso se ejecuta sobre el lote, pero cada
-- dosímetro puede tener un resultado distinto.
-- ------------------------------------------------------------
CREATE TABLE process_execution_items (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  process_execution_id uuid NOT NULL REFERENCES process_executions (id),
  dosimeter_id         uuid NOT NULL REFERENCES dosimeters (id),
  item_status          text NOT NULL DEFAULT 'PROCESADO' CHECK (item_status IN (
                         'PROCESADO',
                         'FALLIDO',
                         'INCIDENTE',
                         'EXCLUIDO'
                       )),
  item_results         jsonb,
  observations         text
);

COMMENT ON TABLE process_execution_items IS 'Resultado individual de cada dosímetro dentro de una ejecución de proceso.';

-- ------------------------------------------------------------
-- contamination_checks
-- Chequeos de contaminación sobre dosímetros individuales.
-- Se separa de process_execution_items porque tiene campos
-- específicos (valor medido, unidad, resultado) que necesitan
-- ser consultados y filtrados directamente.
-- ------------------------------------------------------------
CREATE TABLE contamination_checks (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  dosimeter_id   uuid NOT NULL REFERENCES dosimeters (id),
  checked_at     timestamptz NOT NULL DEFAULT now(),
  checked_by     uuid NOT NULL REFERENCES users (id),
  equipment_id   uuid REFERENCES equipment (id),
  measured_value numeric,
  unit           text,
  result         text NOT NULL CHECK (result IN (
                   'libre',
                   'contaminado_leve',
                   'contaminado_grave'
                 )),
  observations   text
);

COMMENT ON TABLE  contamination_checks        IS 'Chequeos de contaminación por dosímetro. Resultado contaminado bloquea el dosímetro.';
COMMENT ON COLUMN contamination_checks.result  IS 'Si contaminado_*, NestJS actualiza dosimeter.current_condition y genera incident_report.';

-- ------------------------------------------------------------
-- cleaning_cycles
-- Ciclos de limpieza aplicados a cada dosímetro.
-- Se separa porque tiene estructura propia (número de ciclo,
-- método, resultado) y puede iterarse múltiples veces
-- sobre el mismo dosímetro en el mismo proceso.
-- ------------------------------------------------------------
CREATE TABLE cleaning_cycles (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  dosimeter_id         uuid NOT NULL REFERENCES dosimeters (id),
  process_execution_id uuid REFERENCES process_executions (id),
  cycle_number         int NOT NULL,
  cleaning_method      text NOT NULL CHECK (cleaning_method IN (
                         'ultrasonido',
                         'quimico',
                         'mecanico',
                         'combinado'
                       )),
  started_at           timestamptz,
  finished_at          timestamptz,
  result               text NOT NULL CHECK (result IN ('exitoso', 'requiere_reproceso', 'fallido'))
);

COMMENT ON TABLE  cleaning_cycles             IS 'Ciclos de limpieza por dosímetro. Un dosímetro puede requerir múltiples ciclos.';
COMMENT ON COLUMN cleaning_cycles.cycle_number IS 'Número secuencial del ciclo dentro del proceso de limpieza.';

-- ------------------------------------------------------------
-- dosimeter_readings
-- Medición de dosis de cada dosímetro.
-- ISO 17025: la lectura debe vincularse al equipo utilizado
-- (y su calibración vigente), al usuario que la realizó,
-- y a la orden de servicio correspondiente.
-- ------------------------------------------------------------
CREATE TABLE dosimeter_readings (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  raw_data         jsonb
);

COMMENT ON TABLE  dosimeter_readings              IS 'Lecturas de dosis. ISO 17025 exige vincular cada lectura al equipo y su calibración vigente.';
COMMENT ON COLUMN dosimeter_readings.uncertainty   IS 'Incertidumbre de la medición. Requerida por ISO 17025 en el informe de resultados.';
COMMENT ON COLUMN dosimeter_readings.raw_data       IS 'Datos crudos del equipo lector. Preserva evidencia para auditorías.';

-- ------------------------------------------------------------
-- qc_records
-- Controles de calidad asociados a ejecuciones de proceso.
-- ISO 17025: los controles de calidad son obligatorios en
-- procesos de medición. Cada QC tiene criterios de aceptación
-- definidos y un resultado medible.
-- ------------------------------------------------------------
CREATE TABLE qc_records (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  process_execution_id uuid NOT NULL REFERENCES process_executions (id),
  qc_type              text NOT NULL CHECK (qc_type IN (
                         'patron_referencia',
                         'blanco',
                         'duplicado',
                         'control_positivo',
                         'verificacion_equipo'
                       )),
  result               text NOT NULL CHECK (result IN ('aprobado', 'rechazado', 'condicional')),
  value                numeric,
  unit                 text,
  acceptance_criteria  text NOT NULL,
  observations         text
);

COMMENT ON TABLE  qc_records                    IS 'Controles de calidad por ejecución. ISO 17025 exige QC documentado en procesos de medición.';
COMMENT ON COLUMN qc_records.acceptance_criteria IS 'Criterio de aceptación aplicado. Ej: ±5% del valor de referencia.';

-- ------------------------------------------------------------
-- incident_reports
-- Registro de anomalías durante cualquier etapa del proceso.
-- Tiene su propio ciclo de vida (status) porque los incidentes
-- se investigan y se resuelven de forma independiente al proceso.
-- ------------------------------------------------------------
CREATE TABLE incident_reports (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  process_execution_id uuid REFERENCES process_executions (id),
  reported_by          uuid NOT NULL REFERENCES users (id),
  incident_type        text NOT NULL CHECK (incident_type IN (
                         'contaminacion',
                         'sello_roto',
                         'dosis_elevada',
                         'equipo_fuera_calibracion',
                         'error_procedimiento',
                         'perdida_dosimetro',
                         'otro'
                       )),
  severity             text NOT NULL CHECK (severity IN ('baja', 'media', 'alta', 'critica')),
  status               text NOT NULL DEFAULT 'ABIERTO' CHECK (status IN (
                         'ABIERTO',
                         'EN_INVESTIGACION',
                         'RESUELTO',
                         'CERRADO'
                       )),
  description          text NOT NULL,
  reported_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE incident_reports IS 'Anomalías detectadas durante el proceso. Ciclo de vida propio independiente del proceso principal.';
