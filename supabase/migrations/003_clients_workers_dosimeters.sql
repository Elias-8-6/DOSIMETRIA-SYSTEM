-- ============================================================
-- MIGRACIÓN 003 — Clientes, trabajadores y dosímetros
-- El núcleo del dominio de negocio.
-- Depende de: 001_base_catalogs, 002_laboratory_infrastructure
--
-- DECISIÓN DE DISEÑO: dosimeters NO tiene FK a clients.
-- Un dosímetro es un activo del laboratorio — existe
-- independientemente de cualquier cliente. La relación
-- dosímetro-cliente se establece en:
--   - dosimeter_assignments → cuando se asigna a un worker
--   - service_order_items   → cuando entra en una orden
-- Esto permite que el lab tenga sus propios dosímetros
-- sin asignarlos a ningún cliente.
-- ============================================================

-- ------------------------------------------------------------
-- clients
-- Instituciones externas que contratan al laboratorio.
-- Se vinculan a una organización porque en el modelo
-- multi-tenant cada cliente tiene su propia organización.
-- ------------------------------------------------------------
CREATE TABLE clients (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations (id),
  code            text UNIQUE,
  name            text NOT NULL,
  contact_name    text,
  contact_email   text,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  clients     IS 'Instituciones cliente que envían dosímetros al laboratorio para procesamiento.';
COMMENT ON COLUMN clients.code IS 'Código corto de referencia interna (ej: HOSP-001). Generado por NestJS.';

-- ------------------------------------------------------------
-- client_locations
-- Sedes físicas de cada cliente. Un trabajador opera en una
-- ubicación específica, lo que permite análisis de dosis
-- por área geográfica o departamento.
-- ------------------------------------------------------------
CREATE TABLE client_locations (
  id        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL REFERENCES clients (id),
  name      text NOT NULL,
  address   text,
  status    text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
);

COMMENT ON TABLE client_locations IS 'Ubicaciones físicas de cada institución cliente. Permite vincular dosis a un área geográfica.';

-- ------------------------------------------------------------
-- workers
-- Personas que portan dosímetros en las instituciones cliente.
-- NO son usuarios del sistema — son los sujetos dosimetrados.
-- Su historial de dosis se construye a través de
-- dosimeter_assignments y dosimeter_readings.
-- ------------------------------------------------------------
CREATE TABLE workers (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id          uuid NOT NULL REFERENCES clients (id),
  client_location_id uuid REFERENCES client_locations (id),
  employee_code      text,
  full_name          text NOT NULL,
  document_number    text,
  status             text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  UNIQUE (client_id, document_number)
);

COMMENT ON TABLE  workers                 IS 'Trabajadores de instituciones cliente que portan dosímetros.';
COMMENT ON COLUMN workers.document_number IS 'Número de identificación del trabajador. Único por cliente.';

-- ------------------------------------------------------------
-- dosimeters
-- Entidad central del sistema. Todo el flujo de trazabilidad
-- pivota sobre esta tabla.
-- Un dosímetro es un activo del laboratorio — NO tiene FK
-- a clients. Su relación con un cliente se establece
-- indirectamente a través de dosimeter_assignments y
-- service_order_items.
-- ------------------------------------------------------------
CREATE TABLE dosimeters (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  dosimeter_type_id   uuid NOT NULL REFERENCES dosimeter_types (id),
  status_id           uuid NOT NULL REFERENCES dosimeter_statuses (id),
  serial_number       text NOT NULL UNIQUE,
  internal_code       text UNIQUE,
  lot_number          text,
  manufacture_date    date,
  commissioning_date  date,
  current_condition   text NOT NULL DEFAULT 'normal' CHECK (current_condition IN (
                        'normal',
                        'danado',
                        'contaminado',
                        'perdido'
                      )),
  reusable            boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  dosimeters               IS 'Entidad central. Activo del laboratorio — sin FK a clients. Relación con cliente vía assignments y orders.';
COMMENT ON COLUMN dosimeters.serial_number IS 'Número de serie del fabricante. Único en todo el sistema.';
COMMENT ON COLUMN dosimeters.internal_code IS 'Código interno del laboratorio. Asignado por NestJS al comisionar.';
COMMENT ON COLUMN dosimeters.status_id     IS 'FK a dosimeter_statuses. NestJS valida transiciones de estado permitidas.';

-- ------------------------------------------------------------
-- dosimeter_assignments
-- Registro temporal de quién porta cada dosímetro.
-- returned_at NULL = asignación abierta (dosímetro en campo).
-- returned_at NOT NULL = ciclo cerrado.
-- La validación de asignación única abierta ocurre en NestJS
-- antes de insertar — nunca dos registros abiertos para
-- el mismo dosimeter_id.
-- ------------------------------------------------------------
CREATE TABLE dosimeter_assignments (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  dosimeter_id  uuid NOT NULL REFERENCES dosimeters (id),
  worker_id     uuid NOT NULL REFERENCES workers (id),
  assigned_at   date NOT NULL,
  returned_at   date,
  status        text NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'cerrado')),
  notes         text
);

COMMENT ON TABLE  dosimeter_assignments             IS 'Historial de quién portó cada dosímetro y durante qué período.';
COMMENT ON COLUMN dosimeter_assignments.returned_at IS 'NULL = dosímetro aún en campo. NestJS bloquea nueva asignación mientras sea NULL.';

-- Índice para la consulta crítica de asignación abierta
-- NestJS la ejecuta en cada AssignDosimeterUseCase
CREATE INDEX idx_assignments_open
  ON dosimeter_assignments (dosimeter_id)
  WHERE returned_at IS NULL;

COMMENT ON INDEX idx_assignments_open IS 'Optimiza la validación de asignación abierta en AssignDosimeterUseCase.';
