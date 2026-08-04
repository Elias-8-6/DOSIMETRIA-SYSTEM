-- ============================================================
-- MIGRACIÓN 017 — Habilitar RLS (default-deny) en tablas que
-- quedaron sin ninguna política desde 001-006.
--
-- HALLAZGO: qc_records, contamination_checks, cleaning_cycles,
-- process_execution_items, documents, document_versions,
-- attached_documents, environmental_records,
-- equipment_maintenance y los catálogos base (roles,
-- dosimeter_types, dosimeter_statuses, process_definitions,
-- process_steps) nunca tuvieron RLS habilitado. Si PostgREST
-- quedara expuesto directamente con la anon/authenticated key,
-- cualquiera podría leer o escribir libremente en estas tablas
-- — incluyendo qc_records, que ISO 17025 exige documentado y
-- trazable.
--
-- DECISIÓN: se habilita RLS SIN agregar una política permisiva.
-- Postgres deniega por defecto toda fila a los roles anon/
-- authenticated cuando RLS está activo y no hay política que
-- la autorice explícitamente. Hoy el único acceso real a estas
-- tablas es vía NestJS con service_role_key (que bypassa RLS),
-- así que esto cierra el hueco de exposición directa sin tener
-- que diseñar ya las reglas finas de visibilidad cruzada
-- cliente-laboratorio (ej. qué debería poder ver un coordinador
-- de cliente de los QC de sus propias muestras) — esas reglas
-- se añaden cuando se construyan los módulos que las necesiten
-- (lab_process, readings, reports). No es un olvido: es una
-- postura conservadora deliberada.
-- ============================================================

ALTER TABLE roles                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE dosimeter_types          ENABLE ROW LEVEL SECURITY;
ALTER TABLE dosimeter_statuses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_definitions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_steps            ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_maintenance    ENABLE ROW LEVEL SECURITY;
ALTER TABLE environmental_records    ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_execution_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE contamination_checks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_cycles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_records               ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents                ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE attached_documents       ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE qc_records IS 'Controles de calidad por ejecución. ISO 17025 exige QC documentado en procesos de medición. RLS habilitado sin política permisiva (deny-all directo a PostgREST) hasta que el módulo lab_process defina reglas de visibilidad cruzada.';
