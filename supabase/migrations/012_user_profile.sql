-- ============================================================
-- MIGRACIÓN 012 — Perfil extendido de usuarios
-- Agrega campos de perfil profesional y ubicación.
-- Depende de: 002_laboratory_infrastructure
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS degree_title text,
  ADD COLUMN IF NOT EXISTS university   text,
  ADD COLUMN IF NOT EXISTS location     text;

COMMENT ON COLUMN users.degree_title IS 'Título universitario del usuario (ej: Licenciado en Física).';
COMMENT ON COLUMN users.university   IS 'Universidad donde obtuvo el título.';
COMMENT ON COLUMN users.location     IS 'Ubicación/ciudad de residencia del usuario.';
