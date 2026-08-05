-- ============================================================
-- MIGRACIÓN 013 — Campos adicionales para entorno real
-- Agrega información necesaria para operar en producción.
-- Depende de: 001, 002, 003, 004, 005, 006, 007, 008, 009, 010, 011, 012
-- ============================================================

-- ------------------------------------------------------------
-- users — datos personales y profesionales del personal
-- ------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS document_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS phone           text,
  ADD COLUMN IF NOT EXISTS date_of_birth   date,
  ADD COLUMN IF NOT EXISTS hire_date       date,
  ADD COLUMN IF NOT EXISTS signature_url   text,
  ADD COLUMN IF NOT EXISTS profile_photo_url text;

COMMENT ON COLUMN users.document_number    IS 'Cédula o DNI del empleado. Único en el sistema.';
COMMENT ON COLUMN users.phone              IS 'Teléfono de contacto del empleado.';
COMMENT ON COLUMN users.date_of_birth      IS 'Fecha de nacimiento del empleado.';
COMMENT ON COLUMN users.hire_date          IS 'Fecha de contratación. Requerida por ISO 17025 para trazabilidad del personal.';
COMMENT ON COLUMN users.signature_url      IS 'URL a la firma digitalizada en Supabase Storage. Usada en informes ISO 17025.';
COMMENT ON COLUMN users.profile_photo_url  IS 'URL a la foto de perfil en Supabase Storage.';

-- ------------------------------------------------------------
-- workers — datos personales y ocupacionales
-- ------------------------------------------------------------
ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS gender        text CHECK (gender IN ('masculino', 'femenino', 'otro')),
  ADD COLUMN IF NOT EXISTS phone         text,
  ADD COLUMN IF NOT EXISTS email         text,
  ADD COLUMN IF NOT EXISTS occupation    text,
  ADD COLUMN IF NOT EXISTS start_date    date;

COMMENT ON COLUMN workers.date_of_birth IS 'Fecha de nacimiento. Relevante para límites de dosis por edad.';
COMMENT ON COLUMN workers.gender        IS 'Sexo biológico. Los límites de dosis difieren para mujeres embarazadas.';
COMMENT ON COLUMN workers.phone         IS 'Teléfono de contacto del trabajador.';
COMMENT ON COLUMN workers.email         IS 'Email del trabajador para notificación de resultados.';
COMMENT ON COLUMN workers.occupation    IS 'Cargo o puesto específico (ej: radiólogo, enfermero, técnico).';
COMMENT ON COLUMN workers.start_date    IS 'Fecha de inicio en el programa de dosimetría. Base para historial acumulado.';

-- ------------------------------------------------------------
-- clients — datos institucionales completos
-- ------------------------------------------------------------
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS phone               text,
  ADD COLUMN IF NOT EXISTS address             text,
  ADD COLUMN IF NOT EXISTS website             text,
  ADD COLUMN IF NOT EXISTS client_type         text CHECK (client_type IN (
                                                 'hospital',
                                                 'clinica',
                                                 'industria',
                                                 'investigacion',
                                                 'gobierno',
                                                 'otro'
                                               )),
  ADD COLUMN IF NOT EXISTS contract_start_date date,
  ADD COLUMN IF NOT EXISTS contract_end_date   date;

COMMENT ON COLUMN clients.phone               IS 'Teléfono institucional principal.';
COMMENT ON COLUMN clients.address             IS 'Dirección física de la institución.';
COMMENT ON COLUMN clients.website             IS 'Sitio web institucional.';
COMMENT ON COLUMN clients.client_type         IS 'Tipo de institución cliente.';
COMMENT ON COLUMN clients.contract_start_date IS 'Inicio del contrato de servicio de dosimetría.';
COMMENT ON COLUMN clients.contract_end_date   IS 'Vencimiento del contrato. NestJS puede alertar cuando se acerca.';

-- ------------------------------------------------------------
-- client_locations — datos de la sede
-- ------------------------------------------------------------
ALTER TABLE client_locations
  ADD COLUMN IF NOT EXISTS phone          text,
  ADD COLUMN IF NOT EXISTS contact_name   text,
  ADD COLUMN IF NOT EXISTS radiation_type text CHECK (radiation_type IN (
                                            'rayos_x',
                                            'gamma',
                                            'neutrones',
                                            'beta',
                                            'mixta',
                                            'otro'
                                          )),
  ADD COLUMN IF NOT EXISTS risk_level     text CHECK (risk_level IN ('bajo', 'medio', 'alto'));

COMMENT ON COLUMN client_locations.phone          IS 'Teléfono de contacto de la sede.';
COMMENT ON COLUMN client_locations.contact_name   IS 'Responsable de dosimetría en esta sede.';
COMMENT ON COLUMN client_locations.radiation_type IS 'Tipo de radiación predominante en la sede.';
COMMENT ON COLUMN client_locations.risk_level     IS 'Nivel de riesgo radiológico de la sede.';

-- ------------------------------------------------------------
-- dosimeters — parámetros de uso
-- ------------------------------------------------------------
ALTER TABLE dosimeters
  ADD COLUMN IF NOT EXISTS wear_period_days   int,
  ADD COLUMN IF NOT EXISTS max_dose_limit     numeric,
  ADD COLUMN IF NOT EXISTS last_annealing_date date,
  ADD COLUMN IF NOT EXISTS notes              text;

COMMENT ON COLUMN dosimeters.wear_period_days    IS 'Período de uso en días (ej: 30, 60, 90). Define cuándo debe devolverse.';
COMMENT ON COLUMN dosimeters.max_dose_limit      IS 'Límite máximo de dosis en mSv para este dosímetro.';
COMMENT ON COLUMN dosimeters.last_annealing_date IS 'Última fecha de borrado/recocido (TLD). Requerido para trazabilidad.';
COMMENT ON COLUMN dosimeters.notes               IS 'Observaciones generales sobre el dosímetro.';

-- ------------------------------------------------------------
-- service_orders — trazabilidad de creación y prioridad
-- ------------------------------------------------------------
ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users (id),
  ADD COLUMN IF NOT EXISTS priority   text NOT NULL DEFAULT 'normal'
                                      CHECK (priority IN ('normal', 'urgente', 'critica'));

COMMENT ON COLUMN service_orders.created_by IS 'Usuario que creó la orden. Requerido por ISO 17025.';
COMMENT ON COLUMN service_orders.priority   IS 'Prioridad de procesamiento de la orden.';

-- ------------------------------------------------------------
-- dosimeter_readings — campos estándar ISO de dosis
-- ------------------------------------------------------------
ALTER TABLE dosimeter_readings
  ADD COLUMN IF NOT EXISTS hp10         numeric,
  ADD COLUMN IF NOT EXISTS hp007        numeric,
  ADD COLUMN IF NOT EXISTS background_dose numeric,
  ADD COLUMN IF NOT EXISTS period_start date,
  ADD COLUMN IF NOT EXISTS period_end   date;

COMMENT ON COLUMN dosimeter_readings.hp10            IS 'Dosis equivalente cuerpo entero Hp(10) en mSv. Campo estándar ISO.';
COMMENT ON COLUMN dosimeter_readings.hp007           IS 'Dosis equivalente piel Hp(0.07) en mSv. Campo estándar ISO.';
COMMENT ON COLUMN dosimeter_readings.background_dose IS 'Dosis de fondo sustraída de la lectura bruta.';
COMMENT ON COLUMN dosimeter_readings.period_start    IS 'Inicio del período de uso del dosímetro.';
COMMENT ON COLUMN dosimeter_readings.period_end      IS 'Fin del período de uso del dosímetro.';

-- ------------------------------------------------------------
-- equipment — datos de fabricante y mantenimiento
-- ------------------------------------------------------------
ALTER TABLE equipment
  ADD COLUMN IF NOT EXISTS manufacturer              text,
  ADD COLUMN IF NOT EXISTS purchase_date             date,
  ADD COLUMN IF NOT EXISTS warranty_expiry_date      date,
  ADD COLUMN IF NOT EXISTS calibration_interval_days int;

COMMENT ON COLUMN equipment.manufacturer              IS 'Fabricante del equipo.';
COMMENT ON COLUMN equipment.purchase_date             IS 'Fecha de compra del equipo.';
COMMENT ON COLUMN equipment.warranty_expiry_date      IS 'Fecha de vencimiento de la garantía.';
COMMENT ON COLUMN equipment.calibration_interval_days IS 'Intervalo de calibración en días. NestJS puede alertar cuando se acerca.';

-- ------------------------------------------------------------
-- incident_reports — cierre y trazabilidad del incidente
-- ------------------------------------------------------------
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS dosimeter_id      uuid REFERENCES dosimeters (id),
  ADD COLUMN IF NOT EXISTS resolved_by       uuid REFERENCES users (id),
  ADD COLUMN IF NOT EXISTS resolved_at       timestamptz,
  ADD COLUMN IF NOT EXISTS corrective_action text;

COMMENT ON COLUMN incident_reports.dosimeter_id      IS 'Dosímetro involucrado en el incidente (si aplica).';
COMMENT ON COLUMN incident_reports.resolved_by       IS 'Usuario que resolvió el incidente.';
COMMENT ON COLUMN incident_reports.resolved_at       IS 'Fecha y hora de resolución del incidente.';
COMMENT ON COLUMN incident_reports.corrective_action IS 'Descripción de la acción correctiva tomada.';
