-- ============================================================
-- MIGRACIÓN 002 — Infraestructura del laboratorio
-- Sedes, áreas, usuarios, roles y equipos.
-- Depende de: 001_base_catalogs
-- ============================================================

-- ------------------------------------------------------------
-- laboratory_sites
-- Sedes físicas del laboratorio. Un laboratorio puede operar
-- en múltiples ubicaciones. Cada sede tiene sus propias áreas
-- y equipos.
-- ------------------------------------------------------------
CREATE TABLE laboratory_sites (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations (id),
  name            text NOT NULL,
  address         text,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE laboratory_sites IS 'Sedes físicas del laboratorio. Cada sede tiene áreas y equipos propios.';

-- ------------------------------------------------------------
-- areas
-- Espacios físicos dentro de una sede donde se ejecutan los
-- procesos. ISO 17025: cada ejecución de proceso debe poder
-- vincularse al área donde ocurrió, junto con sus condiciones
-- ambientales (temperatura, humedad).
-- ------------------------------------------------------------
CREATE TABLE areas (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  laboratory_site_id  uuid NOT NULL REFERENCES laboratory_sites (id),
  name                text NOT NULL,
  area_type           text NOT NULL CHECK (area_type IN (
                        'recepcion',
                        'sala_limpia',
                        'sala_lectura',
                        'sala_armado',
                        'sala_qc',
                        'almacen'
                      )),
  status              text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  areas           IS 'Áreas físicas de una sede de laboratorio.';
COMMENT ON COLUMN areas.area_type IS 'Tipo de área. Define qué procesos pueden ejecutarse en ella.';

-- ------------------------------------------------------------
-- users
-- Usuarios del sistema (personal del laboratorio y
-- coordinadores de clientes). No son los trabajadores que
-- portan dosímetros — esos están en la tabla workers.
-- ------------------------------------------------------------
CREATE TABLE users (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations (id),
  full_name       text NOT NULL,
  email           text NOT NULL UNIQUE,
  password_hash   text NOT NULL,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  users              IS 'Usuarios del sistema. Personal del laboratorio e instituciones cliente.';
COMMENT ON COLUMN users.password_hash IS 'Hash bcrypt gestionado por NestJS. Supabase Auth no se usa — autenticación propia.';

-- ------------------------------------------------------------
-- user_roles
-- Asignación de roles a usuarios. Relación many-to-many.
-- Un usuario puede tener múltiples roles pero opera con uno
-- por sesión (rol activo queda en el JWT).
-- ISO 17025: cada acción en audit_logs registra el rol
-- con que fue ejecutada, no solo el user_id.
-- ------------------------------------------------------------
CREATE TABLE user_roles (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid NOT NULL REFERENCES users (id),
  role_id     uuid NOT NULL REFERENCES roles (id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_id)
);

COMMENT ON TABLE user_roles IS 'Roles asignados a cada usuario. El rol activo en sesión se incluye en el JWT.';

-- ------------------------------------------------------------
-- training_records
-- Registro de capacitaciones del personal.
-- ISO 17025: el laboratorio debe demostrar que el personal
-- que ejecuta procesos está calificado y con formación vigente.
-- ------------------------------------------------------------
CREATE TABLE training_records (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES users (id),
  training_name text NOT NULL,
  valid_from    date,
  valid_until   date,
  evidence_url  text
);

COMMENT ON TABLE  training_records             IS 'Capacitaciones del personal. ISO 17025 requiere evidencia de competencia.';
COMMENT ON COLUMN training_records.evidence_url IS 'URL al archivo en Supabase Storage con el certificado o evidencia.';

-- ------------------------------------------------------------
-- equipment
-- Equipos del laboratorio (lectores, medidores, calibradores).
-- ISO 17025: toda medición debe poder vincularse al equipo
-- que la realizó y a su certificado de calibración vigente.
-- ------------------------------------------------------------
CREATE TABLE equipment (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  laboratory_site_id  uuid NOT NULL REFERENCES laboratory_sites (id),
  code                text NOT NULL UNIQUE,
  name                text NOT NULL,
  model               text,
  serial_number       text,
  equipment_type      text NOT NULL CHECK (equipment_type IN (
                        'lector_tld',
                        'lector_osl',
                        'detector_contaminacion',
                        'balanza',
                        'otro'
                      )),
  status              text NOT NULL DEFAULT 'operativo' CHECK (status IN (
                        'operativo',
                        'en_calibracion',
                        'en_mantenimiento',
                        'fuera_servicio'
                      )),
  commissioning_date  date,
  out_of_service_date date
);

COMMENT ON TABLE equipment IS 'Equipos del laboratorio. Cada lectura de dosis debe vincularse al equipo utilizado y su calibración vigente.';

-- ------------------------------------------------------------
-- equipment_calibrations
-- Historial de calibraciones por equipo.
-- ISO 17025: la trazabilidad metrológica exige que cada
-- instrumento de medición tenga calibración vigente y
-- trazable a patrones nacionales o internacionales.
-- ------------------------------------------------------------
CREATE TABLE equipment_calibrations (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id       uuid NOT NULL REFERENCES equipment (id),
  calibration_date   date NOT NULL,
  next_due_date      date,
  provider           text,
  certificate_number text,
  result             text NOT NULL CHECK (result IN ('aprobado', 'condicional', 'rechazado')),
  certificate_url    text
);

COMMENT ON TABLE  equipment_calibrations             IS 'Historial de calibraciones. ISO 17025 exige trazabilidad metrológica de cada instrumento.';
COMMENT ON COLUMN equipment_calibrations.certificate_url IS 'URL al certificado en Supabase Storage.';

-- ------------------------------------------------------------
-- equipment_maintenance
-- Historial de mantenimientos por equipo.
-- ------------------------------------------------------------
CREATE TABLE equipment_maintenance (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id     uuid NOT NULL REFERENCES equipment (id),
  maintenance_type text NOT NULL CHECK (maintenance_type IN ('preventivo', 'correctivo')),
  maintenance_date date NOT NULL,
  provider         text,
  result           text,
  observations     text
);

COMMENT ON TABLE equipment_maintenance IS 'Registro de mantenimientos preventivos y correctivos de equipos.';

-- ------------------------------------------------------------
-- environmental_records
-- Condiciones ambientales por área y momento.
-- ISO 17025: ciertas mediciones requieren que las condiciones
-- ambientales estén dentro de rangos aceptables. Este registro
-- vincula condiciones al área donde se ejecutó el proceso.
-- ------------------------------------------------------------
CREATE TABLE environmental_records (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  laboratory_site_id  uuid NOT NULL REFERENCES laboratory_sites (id),
  area_id             uuid REFERENCES areas (id),
  recorded_at         timestamptz NOT NULL DEFAULT now(),
  temperature         numeric,
  humidity            numeric,
  pressure            numeric,
  observations        text
);

COMMENT ON TABLE environmental_records IS 'Condiciones ambientales por área. ISO 17025 requiere registro de condiciones durante mediciones críticas.';

-- ------------------------------------------------------------
-- process_steps
-- Pasos ordenados de cada proceso definido.
-- Cada paso puede requerir un equipo y/o un control de calidad.
-- ------------------------------------------------------------
CREATE TABLE process_steps (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  process_definition_id uuid NOT NULL REFERENCES process_definitions (id),
  step_order            int  NOT NULL,
  code                  text NOT NULL,
  name                  text NOT NULL,
  step_type             text NOT NULL CHECK (step_type IN (
                          'inspeccion',
                          'medicion',
                          'limpieza',
                          'desarmado',
                          'armado',
                          'qc',
                          'lectura',
                          'registro'
                        )),
  requires_equipment    boolean NOT NULL DEFAULT false,
  requires_qc           boolean NOT NULL DEFAULT false,
  UNIQUE (process_definition_id, step_order)
);

COMMENT ON TABLE  process_steps                IS 'Pasos ordenados de cada proceso. Define qué debe hacerse, en qué orden y qué requiere.';
COMMENT ON COLUMN process_steps.requires_equipment IS 'Si true, NestJS exige que process_executions incluya equipment_id válido.';
COMMENT ON COLUMN process_steps.requires_qc        IS 'Si true, NestJS exige que se registre al menos un qc_record para esta ejecución.';
