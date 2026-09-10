-- ============================================================
-- MIGRACIÓN 023 — status en organizations
--
-- HALLAZGO: organizations no tenía ninguna forma de marcarse
-- como inactiva. Combinado con que casi todo el RLS del sistema
-- depende de organization_id, si una institución cliente cierra
-- no había ningún mecanismo para retener el acceso a los
-- historiales de dosis de sus ex-trabajadores (que por regulación
-- deben seguir siendo consultables por 70 años) sin que la
-- organización siguiera operando con normalidad.
--
-- Se agrega el mismo patrón soft-delete que ya usan clients y
-- workers. La aplicación de la regla de negocio ("una
-- organización inactive no puede operar, pero su historial sigue
-- siendo legible") queda para NestJS cuando se implemente —
-- este commit solo habilita el dato en el schema.
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'));

COMMENT ON COLUMN organizations.status IS 'active | inactive. Una organización inactive no debe permitir nuevas operaciones, pero el historial de dosis de los workers vinculados a ella (vía clients) debe seguir siendo consultable — requisito de retención regulatoria a largo plazo.';
