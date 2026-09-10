-- ============================================================
-- MIGRACIÓN 024 — Constraint de versión única a nivel de DB
--
-- HALLAZGO: "solo una versión current_version=true por documento"
-- dependía 100% de que NestJS lo validara antes de insertar (ver
-- comentario original en 006). attached_documents sí tiene su
-- validación polimórfica reforzada con un CHECK a nivel de DB
-- (attached_documents_single_ref) — document_versions no tenía
-- el equivalente.
-- ============================================================

CREATE UNIQUE INDEX idx_document_versions_single_current
  ON document_versions (document_id)
  WHERE current_version;

COMMENT ON INDEX idx_document_versions_single_current IS 'Garantiza a nivel de DB que solo una versión por documento tenga current_version = true, sin depender de que NestJS lo valide antes de insertar.';
