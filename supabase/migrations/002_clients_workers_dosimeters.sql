-- ============================================================
-- MIGRACIÓN 002 — Clientes, trabajadores y dosímetros
--
-- Consolida: 003, 013 (clients/workers/dosimeters/client_locations),
--            014 (índices clients/workers), 026 (assigned_by)
--
-- NUEVOS CAMPOS enriquecidos:
--   dosimeters.model          — Modelo del dosímetro
--   dosimeters.manufacturer   — Fabricante del dosímetro
--   dosimeters.photo_url      — Imagen del estado físico actual
--
-- DECISIÓN DE DISEÑO: dosimeters NO tiene FK a clients.
-- Un dosímetro es un activo del laboratorio. La relación
-- dosímetro-cliente se establece en dosimeter_assignments y
-- service_order_items.
-- ============================================================

-- ------------------------------------------------------------
-- clients
-- Instituciones externas que contratan al laboratorio.
-- En el modelo multi-tenant cada cliente tiene su propia
-- organización (tipo 'client') creada en el seed.
-- Incluye campos de entorno real de migración 013.
-- ------------------------------------------------------------
CREATE TABLE clients (
  id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     uuid        NOT NULL REFERENCES organizations (id),
  code                text        UNIQUE,
  name                text        NOT NULL,
  contact_name        text,
  contact_email       text,
  status              text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  -- campos de entorno real (migración 013)
  phone               text,
  address             text,
  website             text,
  client_type         text        CHECK (client_type IN (
                        'hospital', 'clinica', 'industria',
                        'investigacion', 'gobierno', 'otro'
                      )),
  contract_start_date date,
  contract_end_date   date
);

COMMENT ON TABLE  clients                    IS 'Instituciones cliente que envían dosímetros al laboratorio para procesamiento.';
COMMENT ON COLUMN clients.code               IS 'Código corto de referencia interna (ej: HOSP-001). Generado por NestJS.';
COMMENT ON COLUMN clients.client_type        IS 'Tipo de institución cliente.';
COMMENT ON COLUMN clients.contract_start_date IS 'Inicio del contrato de servicio de dosimetría.';
COMMENT ON COLUMN clients.contract_end_date   IS 'Vencimiento del contrato. NestJS puede alertar cuando se acerca.';

CREATE INDEX idx_clients_org_name   ON clients (organization_id, name);
CREATE INDEX idx_clients_org_status ON clients (organization_id, status);

-- ------------------------------------------------------------
-- client_locations
-- Sedes físicas de cada cliente.
-- Incluye campos de entorno real de migración 013.
-- ------------------------------------------------------------
CREATE TABLE client_locations (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id      uuid NOT NULL REFERENCES clients (id),
  name           text NOT NULL,
  address        text,
  status         text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  -- campos de entorno real (migración 013)
  phone          text,
  contact_name   text,
  radiation_type text CHECK (radiation_type IN (
                   'rayos_x', 'gamma', 'neutrones', 'beta', 'mixta', 'otro'
                 )),
  risk_level     text CHECK (risk_level IN ('bajo', 'medio', 'alto'))
);

COMMENT ON TABLE  client_locations              IS 'Ubicaciones físicas de cada institución cliente. Permite vincular dosis a un área geográfica.';
COMMENT ON COLUMN client_locations.radiation_type IS 'Tipo de radiación predominante en la sede.';
COMMENT ON COLUMN client_locations.risk_level     IS 'Nivel de riesgo radiológico de la sede.';

CREATE INDEX idx_client_locations_client ON client_locations (client_id);

-- ------------------------------------------------------------
-- workers
-- Personas que portan dosímetros en las instituciones cliente.
-- NO son usuarios del sistema — son los sujetos dosimetrados.
-- Incluye campos de entorno real de migración 013.
-- ------------------------------------------------------------
CREATE TABLE workers (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id          uuid NOT NULL REFERENCES clients (id),
  client_location_id uuid REFERENCES client_locations (id),
  employee_code      text,
  full_name          text NOT NULL,
  document_number    text,
  status             text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  -- campos de entorno real (migración 013)
  date_of_birth      date,
  gender             text CHECK (gender IN ('masculino', 'femenino', 'otro')),
  phone              text,
  email              text,
  occupation         text,
  start_date         date,
  UNIQUE (client_id, document_number)
);

COMMENT ON TABLE  workers                 IS 'Trabajadores de instituciones cliente que portan dosímetros.';
COMMENT ON COLUMN workers.document_number IS 'Número de identificación del trabajador. Único por cliente.';
COMMENT ON COLUMN workers.date_of_birth   IS 'Fecha de nacimiento. Relevante para límites de dosis por edad.';
COMMENT ON COLUMN workers.gender          IS 'Sexo biológico. Los límites de dosis difieren para mujeres embarazadas.';
COMMENT ON COLUMN workers.occupation      IS 'Cargo o puesto específico (ej: radiólogo, enfermero, técnico).';
COMMENT ON COLUMN workers.start_date      IS 'Fecha de inicio en el programa de dosimetría. Base para historial acumulado.';

CREATE INDEX idx_workers_client   ON workers (client_id);
CREATE INDEX idx_workers_location ON workers (client_location_id);

-- ------------------------------------------------------------
-- dosimeters
-- Entidad central del sistema. Todo el flujo de trazabilidad
-- pivota sobre esta tabla.
-- Un dosímetro es un activo del laboratorio — NO tiene FK a clients.
-- Su relación con un cliente se establece indirectamente a través
-- de dosimeter_assignments y service_order_items.
--
-- CAMPOS NUEVOS (enriquecimiento):
--   model        — Modelo del dosímetro (ej: Harshaw 8807)
--   manufacturer — Fabricante (ej: Thermo Fisher Scientific)
--   photo_url    — Imagen del estado físico actual en Supabase Storage
-- ------------------------------------------------------------
CREATE TABLE dosimeters (
  id                  uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
  dosimeter_type_id   uuid    NOT NULL REFERENCES dosimeter_types (id),
  status_id           uuid    NOT NULL REFERENCES dosimeter_statuses (id),
  serial_number       text    NOT NULL UNIQUE,
  internal_code       text    UNIQUE,
  lot_number          text,
  manufacture_date    date,
  commissioning_date  date,
  current_condition   text    NOT NULL DEFAULT 'normal' CHECK (current_condition IN (
                        'normal', 'danado', 'contaminado', 'perdido'
                      )),
  reusable            boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  -- campos de entorno real (migración 013)
  wear_period_days    int,
  max_dose_limit      numeric,
  last_annealing_date date,
  notes               text,
  -- NUEVOS campos de trazabilidad del fabricante
  model               text,
  manufacturer        text,
  photo_url           text
);

COMMENT ON TABLE  dosimeters               IS 'Entidad central. Activo del laboratorio — sin FK a clients. Relación con cliente vía assignments y orders.';
COMMENT ON COLUMN dosimeters.serial_number IS 'Número de serie del fabricante. Único en todo el sistema.';
COMMENT ON COLUMN dosimeters.internal_code IS 'Código interno del laboratorio. Asignado por NestJS al comisionar.';
COMMENT ON COLUMN dosimeters.status_id     IS 'FK a dosimeter_statuses. NestJS valida transiciones de estado permitidas.';
COMMENT ON COLUMN dosimeters.wear_period_days    IS 'Período de uso en días (ej: 30, 60, 90). Define cuándo debe devolverse.';
COMMENT ON COLUMN dosimeters.max_dose_limit      IS 'Límite máximo de dosis en mSv para este dosímetro.';
COMMENT ON COLUMN dosimeters.last_annealing_date IS 'Última fecha de borrado/recocido (TLD). Requerido para trazabilidad.';
COMMENT ON COLUMN dosimeters.model               IS 'Modelo del dosímetro según el fabricante (ej: Harshaw 8807, Panasonic UD-802).';
COMMENT ON COLUMN dosimeters.manufacturer        IS 'Fabricante del dosímetro (ej: Thermo Fisher Scientific, Panasonic, Landauer).';
COMMENT ON COLUMN dosimeters.photo_url           IS 'URL a imagen del estado físico actual del dosímetro en Supabase Storage.';

-- ------------------------------------------------------------
-- dosimeter_assignments
-- Registro temporal de quién porta cada dosímetro.
-- returned_at NULL = asignación abierta (dosímetro en campo).
-- returned_at NOT NULL = ciclo cerrado.
-- assigned_by = quién registró la asignación (migración 026).
-- ------------------------------------------------------------
CREATE TABLE dosimeter_assignments (
  id           uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
  dosimeter_id uuid    NOT NULL REFERENCES dosimeters (id),
  worker_id    uuid    NOT NULL REFERENCES workers (id),
  assigned_at  date    NOT NULL,
  returned_at  date,
  status       text    NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'cerrado')),
  notes        text,
  -- campo de trazabilidad de autoría (migración 026)
  assigned_by  uuid    REFERENCES users (id)
);

COMMENT ON TABLE  dosimeter_assignments             IS 'Historial de quién portó cada dosímetro y durante qué período.';
COMMENT ON COLUMN dosimeter_assignments.returned_at IS 'NULL = dosímetro aún en campo. NestJS bloquea nueva asignación mientras sea NULL.';
COMMENT ON COLUMN dosimeter_assignments.assigned_by IS 'Usuario del laboratorio que registró la asignación. Trazabilidad ISO 17025.';

-- Índice para la consulta crítica de asignación abierta
-- NestJS la ejecuta en cada AssignDosimeterUseCase
CREATE INDEX idx_assignments_open ON dosimeter_assignments (dosimeter_id)
  WHERE returned_at IS NULL;

CREATE INDEX idx_dosimeter_assignments_worker ON dosimeter_assignments (worker_id);

COMMENT ON INDEX idx_assignments_open         IS 'Optimiza la validación de asignación abierta en AssignDosimeterUseCase.';
COMMENT ON INDEX idx_dosimeter_assignments_worker IS 'Optimiza fn_get_dosimeter_history: filtra asignaciones por worker.';
