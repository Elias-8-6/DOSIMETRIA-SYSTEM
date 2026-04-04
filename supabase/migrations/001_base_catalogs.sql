-- ============================================================
-- MIGRACIÓN 001 — Catálogos base
-- Tablas sin dependencias externas. Deben existir antes que
-- cualquier otra tabla del sistema.
-- ============================================================

-- Extensión para UUIDs (requerida en Supabase self-hosted)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- organizations
-- Techo del sistema multi-tenant. El laboratorio y cada
-- institución cliente son organizaciones distintas.
-- ------------------------------------------------------------
CREATE TABLE organizations (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         text NOT NULL,
  legal_id     text,
  type         text NOT NULL CHECK (type IN ('laboratory', 'client')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  organizations         IS 'Entidades raíz del sistema. El laboratorio y sus clientes son organizaciones.';
COMMENT ON COLUMN organizations.type    IS 'laboratory = el laboratorio dueño del sistema | client = institución externa';

-- ------------------------------------------------------------
-- roles
-- Catálogo de roles del sistema. Separado como tabla para
-- permitir crecimiento sin modificar el schema.
-- ISO 17025: cada acción debe poder atribuirse a un rol definido.
-- ------------------------------------------------------------
CREATE TABLE roles (
  id    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code  text NOT NULL UNIQUE,
  name  text NOT NULL
);

COMMENT ON TABLE roles      IS 'Catálogo de roles del sistema. Un usuario puede tener múltiples roles pero opera con uno por sesión.';
COMMENT ON COLUMN roles.code IS 'Identificador técnico usado en guards de NestJS (ej: admin_lab, tecnico_lab, coordinador_cliente)';

-- Roles iniciales del sistema
INSERT INTO roles (code, name) VALUES
  ('admin_lab',           'Administrador del laboratorio'),
  ('tecnico_lab',         'Técnico de laboratorio'),
  ('coordinador_cliente', 'Coordinador de cliente'),
  ('auditor',             'Auditor ISO');

-- ------------------------------------------------------------
-- dosimeter_types
-- Catálogo de tipos de dosímetro por tecnología.
-- Separado de dosimeters para evitar redundancia y permitir
-- agregar tipos sin tocar la tabla principal.
-- ------------------------------------------------------------
CREATE TABLE dosimeter_types (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code       text NOT NULL UNIQUE,
  name       text NOT NULL,
  technology text NOT NULL
);

COMMENT ON TABLE  dosimeter_types           IS 'Tipos de dosímetro disponibles en el laboratorio.';
COMMENT ON COLUMN dosimeter_types.technology IS 'Tecnología base: TLD, OSL, RPL, film, etc.';

-- Tipos iniciales
INSERT INTO dosimeter_types (code, name, technology) VALUES
  ('TLD_PERSONAL',  'Dosímetro TLD personal',    'TLD'),
  ('TLD_AREA',      'Dosímetro TLD de área',      'TLD'),
  ('OSL_PERSONAL',  'Dosímetro OSL personal',     'OSL'),
  ('FILM_PERSONAL', 'Dosímetro de película',      'film');

-- ------------------------------------------------------------
-- dosimeter_statuses
-- Estados posibles de un dosímetro a lo largo de su ciclo de
-- vida. Como catálogo permite agregar estados sin alterar
-- la lógica de negocio existente.
-- ------------------------------------------------------------
CREATE TABLE dosimeter_statuses (
  id    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code  text NOT NULL UNIQUE,
  name  text NOT NULL
);

COMMENT ON TABLE  dosimeter_statuses IS 'Estados del ciclo de vida de un dosímetro.';
COMMENT ON COLUMN dosimeter_statuses.code IS 'Código usado por NestJS para validar transiciones de estado.';

-- Estados del ciclo de vida
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
  id      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code    text NOT NULL UNIQUE,
  name    text NOT NULL,
  version text NOT NULL,
  active  boolean NOT NULL DEFAULT true
);

COMMENT ON TABLE process_definitions IS 'Procedimientos de laboratorio versionados. ISO 17025 exige control documental de procedimientos.';

-- Procesos iniciales del laboratorio de dosimetría
INSERT INTO process_definitions (code, name, version) VALUES
  ('PROC_RECEPCION',  'Recepción e inspección de dosímetros', '1.0'),
  ('PROC_DESARMADO',  'Desarmado de dosímetros',              '1.0'),
  ('PROC_LIMPIEZA',   'Limpieza de componentes',              '1.0'),
  ('PROC_LECTURA',    'Lectura de dosis',                     '1.0'),
  ('PROC_ARMADO',     'Armado de dosímetros',                 '1.0'),
  ('PROC_QC',         'Control de calidad',                   '1.0');
