-- ============================================================
-- MIGRACIÓN 006 — Documentos, adjuntos y audit log
-- Trazabilidad documental y registro de auditoría.
-- Depende de: 001, 002, 003, 004, 005
-- ============================================================

-- ------------------------------------------------------------
-- documents
-- Documentos del sistema de gestión de calidad.
-- ISO 17025: procedimientos, instrucciones y formularios
-- deben estar controlados y versionados.
-- ------------------------------------------------------------
CREATE TABLE documents (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_type text NOT NULL CHECK (document_type IN (
                  'procedimiento',
                  'instruccion_trabajo',
                  'formulario',
                  'politica',
                  'registro'
                )),
  code          text UNIQUE,
  title         text NOT NULL,
  status        text NOT NULL DEFAULT 'vigente' CHECK (status IN (
                  'borrador',
                  'vigente',
                  'obsoleto'
                )),
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE documents IS 'Documentos del SGC. ISO 17025 exige control documental de procedimientos e instrucciones.';

-- ------------------------------------------------------------
-- document_versions
-- Versiones de cada documento. Solo una versión puede estar
-- marcada como current_version = true por documento.
-- NestJS valida esto al crear una nueva versión.
-- ------------------------------------------------------------
CREATE TABLE document_versions (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id      uuid NOT NULL REFERENCES documents (id),
  version          text NOT NULL,
  effective_date   date,
  file_url         text,
  current_version  boolean NOT NULL DEFAULT false,
  UNIQUE (document_id, version)
);

COMMENT ON TABLE  document_versions             IS 'Versiones de documentos. Solo una versión activa por documento.';
COMMENT ON COLUMN document_versions.file_url     IS 'URL al archivo en Supabase Storage.';
COMMENT ON COLUMN document_versions.current_version IS 'NestJS garantiza que solo una versión tenga true por document_id.';

-- ------------------------------------------------------------
-- attached_documents
-- Tabla de unión polimórfica. Un documento puede adjuntarse
-- a una ejecución de proceso, una orden, o un dosímetro.
-- Solo uno de los campos FK debe tener valor a la vez.
-- NestJS valida esto antes de insertar.
-- ------------------------------------------------------------
CREATE TABLE attached_documents (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id          uuid NOT NULL REFERENCES documents (id),
  process_execution_id uuid REFERENCES process_executions (id),
  service_order_id     uuid REFERENCES service_orders (id),
  dosimeter_id         uuid REFERENCES dosimeters (id),
  attachment_type      text NOT NULL CHECK (attachment_type IN (
                         'evidencia',
                         'certificado',
                         'formulario',
                         'reporte'
                       )),
  CONSTRAINT attached_documents_single_ref CHECK (
    (process_execution_id IS NOT NULL)::int +
    (service_order_id IS NOT NULL)::int +
    (dosimeter_id IS NOT NULL)::int = 1
  )
);

COMMENT ON TABLE  attached_documents IS 'Adjuntos polimórficos. Un documento se vincula a exactamente una entidad.';
COMMENT ON CONSTRAINT attached_documents_single_ref ON attached_documents
  IS 'Garantiza que solo una FK tenga valor — la validación polimórfica a nivel de base de datos.';

-- ------------------------------------------------------------
-- audit_logs
-- Registro inmutable de toda acción sobre entidades críticas.
-- ISO 17025: la trazabilidad documental exige poder reconstruir
-- el estado de cualquier entidad en cualquier momento.
-- Esta tabla NO se actualiza ni se borra — solo INSERT.
-- NestJS la escribe a través del AuditLogInterceptor.
-- ------------------------------------------------------------
CREATE TABLE audit_logs (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
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
                 'LOGOUT',
                 'ROLE_SELECT'
               )),
  old_values   jsonb,
  new_values   jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  audit_logs             IS 'Log de auditoría inmutable. ISO 17025: trazabilidad completa de todas las acciones críticas.';
COMMENT ON COLUMN audit_logs.active_role  IS 'Rol con el que el usuario estaba operando al momento de la acción.';
COMMENT ON COLUMN audit_logs.old_values   IS 'Estado anterior de la entidad. NULL en acciones CREATE.';
COMMENT ON COLUMN audit_logs.new_values   IS 'Estado nuevo de la entidad. NULL en acciones DELETE.';

-- Índices para consultas frecuentes de auditoría
CREATE INDEX idx_audit_logs_entity   ON audit_logs (entity_name, entity_id);
CREATE INDEX idx_audit_logs_user     ON audit_logs (user_id);
CREATE INDEX idx_audit_logs_created  ON audit_logs (created_at DESC);
