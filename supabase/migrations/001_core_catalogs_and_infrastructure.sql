-- ============================================================
-- MIGRACIÓN 001 — Catálogos base, infraestructura del laboratorio y personal
--
-- Consolida: 001, 002, 012, 013 (usuarios/equipos), 014 (índices de
--            users/user_roles), 024 (organizations.status)
--
-- Crea todas las tablas sin dependencias externas o dependientes solo
-- de otras tablas de este mismo archivo, en orden correcto de FK.
-- ============================================================

-- Extensión para UUIDs (requerida en Supabase self-hosted)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CATÁLOGOS BASE (sin dependencias externas)
-- ============================================================

-- ------------------------------------------------------------
-- organizations
-- Techo del sistema multi-tenant. El laboratorio y cada
-- institución cliente son organizaciones distintas.
-- ------------------------------------------------------------
CREATE TABLE organizations (
  id         uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       text        NOT NULL,
  legal_id   text,
  type       text        NOT NULL CHECK (type IN ('laboratory', 'client')),
  status     text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  organizations        IS 'Entidades raíz del sistema. El laboratorio y sus clientes son organizaciones.';
COMMENT ON COLUMN organizations.type   IS 'laboratory = el laboratorio dueño del sistema | client = institución externa';
COMMENT ON COLUMN organizations.status IS 'active | inactive. Una organización inactive no permite nuevas operaciones pero su historial de dosis es consultable (retención regulatoria a 70 años).';

-- ------------------------------------------------------------
-- roles
-- Catálogo de roles del sistema. Separado como tabla para
-- permitir crecimiento sin modificar el schema.
-- ISO 17025: cada acción debe poder atribuirse a un rol definido.
-- ------------------------------------------------------------
CREATE TABLE roles (
  id   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  name text NOT NULL
);

COMMENT ON TABLE  roles      IS 'Catálogo de roles del sistema. Un usuario puede tener múltiples roles pero opera con uno por sesión.';
COMMENT ON COLUMN roles.code IS 'Identificador técnico usado en guards de NestJS (ej: admin_lab, tecnico_lab, coordinador_cliente)';

INSERT INTO roles (code, name) VALUES
  ('admin_lab',           'Administrador del laboratorio'),
  ('tecnico_lab',         'Técnico de laboratorio'),
  ('coordinador_cliente', 'Coordinador de cliente'),
  ('auditor',             'Auditor ISO');

-- ------------------------------------------------------------
-- dosimeter_types
-- Catálogo de tipos de dosímetro por tecnología.
-- ------------------------------------------------------------
CREATE TABLE dosimeter_types (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code       text NOT NULL UNIQUE,
  name       text NOT NULL,
  technology text NOT NULL
);

COMMENT ON TABLE  dosimeter_types           IS 'Tipos de dosímetro disponibles en el laboratorio.';
COMMENT ON COLUMN dosimeter_types.technology IS 'Tecnología base: TLD, OSL, RPL, film, etc.';

INSERT INTO dosimeter_types (code, name, technology) VALUES
  ('TLD_PERSONAL',  'Dosímetro TLD personal',    'TLD'),
  ('TLD_AREA',      'Dosímetro TLD de área',      'TLD'),
  ('OSL_PERSONAL',  'Dosímetro OSL personal',     'OSL'),
  ('FILM_PERSONAL', 'Dosímetro de película',      'film');

-- ------------------------------------------------------------
-- dosimeter_statuses
-- Estados posibles de un dosímetro a lo largo de su ciclo de vida.
-- ------------------------------------------------------------
CREATE TABLE dosimeter_statuses (
  id   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  name text NOT NULL
);

COMMENT ON TABLE  dosimeter_statuses      IS 'Estados del ciclo de vida de un dosímetro.';
COMMENT ON COLUMN dosimeter_statuses.code IS 'Código usado por NestJS para validar transiciones de estado.';

INSERT INTO dosimeter_statuses (code, name) VALUES
  ('DISPONIBLE',   'Disponible para asignación'),
  ('ASIGNADO',     'Asignado a trabajador en campo'),
  ('EN_LAB',       'En proceso de laboratorio'),
  ('EN_LECTURA',   'En proceso de lectura'),
  ('PROCESADO',    'Procesado — pendiente de entrega'),
  ('ENTREGADO',    'Entregado a institución'),
  ('BAJA',         'Dado de baja — fuera de servicio'),
  ('INCIDENTE',    'Retenido por incidente reportado');

-- ------------------------------------------------------------
-- process_definitions
-- Plantillas de procedimientos del laboratorio, versionadas.
-- ISO 17025: los procedimientos deben estar documentados,
-- controlados y versionados.
-- ------------------------------------------------------------
CREATE TABLE process_definitions (
  id      uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
  code    text    NOT NULL UNIQUE,
  name    text    NOT NULL,
  version text    NOT NULL,
  active  boolean NOT NULL DEFAULT true
);

COMMENT ON TABLE process_definitions IS 'Procedimientos de laboratorio versionados. ISO 17025 exige control documental de procedimientos.';

INSERT INTO process_definitions (code, name, version) VALUES
  ('PROC_RECEPCION',  'Recepción e inspección de dosímetros', '1.0'),
  ('PROC_DESARMADO',  'Desarmado de dosímetros',              '1.0'),
  ('PROC_LIMPIEZA',   'Limpieza de componentes',              '1.0'),
  ('PROC_LECTURA',    'Lectura de dosis',                     '1.0'),
  ('PROC_ARMADO',     'Armado de dosímetros',                 '1.0'),
  ('PROC_QC',         'Control de calidad',                   '1.0');

-- ============================================================
-- INFRAESTRUCTURA DEL LABORATORIO
-- ============================================================

-- ------------------------------------------------------------
-- laboratory_sites
-- Sedes físicas del laboratorio.
-- ------------------------------------------------------------
CREATE TABLE laboratory_sites (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid        NOT NULL REFERENCES organizations (id),
  name            text        NOT NULL,
  address         text,
  status          text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE laboratory_sites IS 'Sedes físicas del laboratorio. Cada sede tiene áreas y equipos propios.';

-- ------------------------------------------------------------
-- areas
-- Espacios físicos dentro de una sede donde se ejecutan los procesos.
-- ISO 17025: cada ejecución de proceso debe vincularse al área.
-- ------------------------------------------------------------
CREATE TABLE areas (
  id                 uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  laboratory_site_id uuid        NOT NULL REFERENCES laboratory_sites (id),
  name               text        NOT NULL,
  area_type          text        NOT NULL CHECK (area_type IN (
                       'recepcion', 'sala_limpia', 'sala_lectura',
                       'sala_armado', 'sala_qc', 'almacen'
                     )),
  status             text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at         timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  areas           IS 'Áreas físicas de una sede de laboratorio.';
COMMENT ON COLUMN areas.area_type IS 'Tipo de área. Define qué procesos pueden ejecutarse en ella.';

-- ------------------------------------------------------------
-- users
-- Usuarios del sistema (personal del laboratorio y coordinadores).
-- NO son los trabajadores que portan dosímetros — esos están en workers.
-- Incluye todos los campos extendidos de migraciones 012 y 013.
-- ------------------------------------------------------------
CREATE TABLE users (
  id                uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   uuid        NOT NULL REFERENCES organizations (id),
  full_name         text        NOT NULL,
  email             text        NOT NULL UNIQUE,
  password_hash     text        NOT NULL,
  status            text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  -- campos de perfil profesional (migración 012)
  degree_title      text,
  university        text,
  location          text,
  -- campos de entorno real (migración 013)
  document_number   text        UNIQUE,
  phone             text,
  date_of_birth     date,
  hire_date         date,
  signature_url     text,
  profile_photo_url text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  users                   IS 'Usuarios del sistema. Personal del laboratorio e instituciones cliente.';
COMMENT ON COLUMN users.password_hash     IS 'Hash bcrypt gestionado por NestJS. Supabase Auth no se usa — autenticación propia.';
COMMENT ON COLUMN users.degree_title      IS 'Título universitario del usuario (ej: Licenciado en Física).';
COMMENT ON COLUMN users.university        IS 'Universidad donde obtuvo el título.';
COMMENT ON COLUMN users.location          IS 'Ubicación/ciudad de residencia del usuario.';
COMMENT ON COLUMN users.document_number   IS 'Cédula o DNI del empleado. Único en el sistema.';
COMMENT ON COLUMN users.phone             IS 'Teléfono de contacto del empleado.';
COMMENT ON COLUMN users.date_of_birth     IS 'Fecha de nacimiento del empleado.';
COMMENT ON COLUMN users.hire_date         IS 'Fecha de contratación. Requerida por ISO 17025 para trazabilidad del personal.';
COMMENT ON COLUMN users.signature_url     IS 'URL a la firma digitalizada en Supabase Storage. Usada en informes ISO 17025.';
COMMENT ON COLUMN users.profile_photo_url IS 'URL a la foto de perfil en Supabase Storage.';

CREATE INDEX idx_users_org_created ON users (organization_id, created_at DESC);
CREATE INDEX idx_users_org_status  ON users (organization_id, status);

-- ------------------------------------------------------------
-- user_roles
-- Asignación de roles a usuarios. Relación many-to-many.
-- Un usuario puede tener múltiples roles pero opera con uno por sesión.
-- ------------------------------------------------------------
CREATE TABLE user_roles (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid        NOT NULL REFERENCES users (id),
  role_id     uuid        NOT NULL REFERENCES roles (id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_id)
);

COMMENT ON TABLE user_roles IS 'Roles asignados a cada usuario. El rol activo en sesión se incluye en el JWT.';

CREATE INDEX idx_user_roles_user ON user_roles (user_id);

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

COMMENT ON TABLE  training_records            IS 'Capacitaciones del personal. ISO 17025 requiere evidencia de competencia.';
COMMENT ON COLUMN training_records.evidence_url IS 'URL al archivo en Supabase Storage con el certificado o evidencia.';

-- ------------------------------------------------------------
-- equipment
-- Equipos del laboratorio (lectores, medidores, calibradores).
-- ISO 17025: toda medición debe vincularse al equipo y su
-- certificado de calibración vigente.
-- Incluye campos de entorno real de migración 013.
-- ------------------------------------------------------------
CREATE TABLE equipment (
  id                      uuid  PRIMARY KEY DEFAULT uuid_generate_v4(),
  laboratory_site_id      uuid  NOT NULL REFERENCES laboratory_sites (id),
  code                    text  NOT NULL UNIQUE,
  name                    text  NOT NULL,
  model                   text,
  serial_number           text,
  equipment_type          text  NOT NULL CHECK (equipment_type IN (
                            'lector_tld', 'lector_osl', 'detector_contaminacion', 'balanza', 'otro'
                          )),
  status                  text  NOT NULL DEFAULT 'operativo' CHECK (status IN (
                            'operativo', 'en_calibracion', 'en_mantenimiento', 'fuera_servicio'
                          )),
  commissioning_date      date,
  out_of_service_date     date,
  -- campos de entorno real (migración 013)
  manufacturer            text,
  purchase_date           date,
  warranty_expiry_date    date,
  calibration_interval_days int
);

COMMENT ON TABLE  equipment                           IS 'Equipos del laboratorio. Cada lectura de dosis debe vincularse al equipo utilizado y su calibración vigente.';
COMMENT ON COLUMN equipment.manufacturer              IS 'Fabricante del equipo.';
COMMENT ON COLUMN equipment.purchase_date             IS 'Fecha de compra del equipo.';
COMMENT ON COLUMN equipment.warranty_expiry_date      IS 'Fecha de vencimiento de la garantía.';
COMMENT ON COLUMN equipment.calibration_interval_days IS 'Intervalo de calibración en días. NestJS puede alertar cuando se acerca.';

-- ------------------------------------------------------------
-- equipment_calibrations
-- Historial de calibraciones por equipo.
-- ISO 17025: trazabilidad metrológica exige calibración vigente
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
-- ISO 17025: ciertas mediciones requieren condiciones ambientales
-- dentro de rangos aceptables.
-- ------------------------------------------------------------
CREATE TABLE environmental_records (
  id                 uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  laboratory_site_id uuid        NOT NULL REFERENCES laboratory_sites (id),
  area_id            uuid        REFERENCES areas (id),
  recorded_at        timestamptz NOT NULL DEFAULT now(),
  temperature        numeric,
  humidity           numeric,
  pressure           numeric,
  observations       text
);

COMMENT ON TABLE environmental_records IS 'Condiciones ambientales por área. ISO 17025 requiere registro de condiciones durante mediciones críticas.';

-- ------------------------------------------------------------
-- process_steps
-- Pasos ordenados de cada proceso definido.
-- ------------------------------------------------------------
CREATE TABLE process_steps (
  id                    uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
  process_definition_id uuid    NOT NULL REFERENCES process_definitions (id),
  step_order            int     NOT NULL,
  code                  text    NOT NULL,
  name                  text    NOT NULL,
  step_type             text    NOT NULL CHECK (step_type IN (
                          'inspeccion', 'medicion', 'limpieza', 'desarmado',
                          'armado', 'qc', 'lectura', 'registro'
                        )),
  requires_equipment    boolean NOT NULL DEFAULT false,
  requires_qc           boolean NOT NULL DEFAULT false,
  UNIQUE (process_definition_id, step_order)
);

COMMENT ON TABLE  process_steps                   IS 'Pasos ordenados de cada proceso. Define qué debe hacerse, en qué orden y qué requiere.';
COMMENT ON COLUMN process_steps.requires_equipment IS 'Si true, NestJS exige que process_executions incluya equipment_id válido.';
COMMENT ON COLUMN process_steps.requires_qc        IS 'Si true, NestJS exige que se registre al menos un qc_record para esta ejecución.';
