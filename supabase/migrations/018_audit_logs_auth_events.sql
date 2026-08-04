-- ============================================================
-- MIGRACIÓN 018 — Soporte para auditoría de eventos de auth
--
-- HALLAZGO: auth.service.ts nunca llamaba a AuditService — no
-- quedaba registro de logins (exitosos ni fallidos), logouts,
-- refresh ni cambios de contraseña. Para ISO 17025 esto es una
-- brecha real de trazabilidad: es justo el tipo de evento que
-- un auditor va a pedir.
--
-- Esta migración solo prepara el schema:
--   - agrega 'LOGIN_FAILED' al CHECK de audit_logs.action
--     (LOGIN/LOGOUT ya existían desde 006 pero sin uso real)
--   - agrega ip_address / user_agent para poder reconstruir
--     desde dónde ocurrió cada evento de sesión
-- ============================================================

ALTER TABLE audit_logs
  DROP CONSTRAINT audit_logs_action_check;

ALTER TABLE audit_logs
  ADD CONSTRAINT audit_logs_action_check CHECK (action IN (
    'CREATE',
    'UPDATE',
    'DELETE',
    'STATUS_CHANGE',
    'LOGIN',
    'LOGIN_FAILED',
    'LOGOUT',
    'ROLE_SELECT'
  ));

ALTER TABLE audit_logs
  ADD COLUMN ip_address inet,
  ADD COLUMN user_agent text;

COMMENT ON COLUMN audit_logs.ip_address IS 'IP de origen de la request. NULL en eventos que no vienen de un request HTTP directo.';
COMMENT ON COLUMN audit_logs.user_agent IS 'User-Agent del cliente HTTP que originó el evento.';
