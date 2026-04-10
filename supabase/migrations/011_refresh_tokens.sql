-- ============================================================
-- MIGRACIÓN 011 — Refresh tokens
-- Almacena los refresh tokens activos por usuario.
-- El token nunca se guarda en texto plano — solo su hash.
--
-- FLUJO:
--   Login       → genera refresh_token → guarda hash en esta tabla
--   /refresh    → busca por hash → revoca el viejo → guarda hash nuevo
--   /logout     → marca revoked = true
--
-- SEGURIDAD:
--   - token_hash: bcryptjs del token real — si la DB se compromete
--     los tokens no son utilizables directamente
--   - revoked: permite invalidar tokens sin esperar que expiren
--   - expires_at: segunda línea de defensa — aunque revoked = false,
--     si ya expiró no se acepta
-- ============================================================

CREATE TABLE refresh_tokens (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid        NOT NULL REFERENCES users (id),
  token_hash  text        NOT NULL,
  expires_at  timestamptz NOT NULL,
  revoked     boolean     NOT NULL DEFAULT false,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  refresh_tokens            IS 'Refresh tokens activos por usuario. Solo se guarda el hash — nunca el token en texto plano.';
COMMENT ON COLUMN refresh_tokens.token_hash IS 'Hash bcryptjs del refresh token. El token real solo existe en el cliente.';
COMMENT ON COLUMN refresh_tokens.revoked    IS 'true = token invalidado. Se revoca en logout o al rotar tokens.';
COMMENT ON COLUMN refresh_tokens.revoked_at IS 'Timestamp de cuándo fue revocado. Útil para auditoría.';
COMMENT ON COLUMN refresh_tokens.expires_at IS 'Fecha de expiración. Aunque revoked=false, si expiró no se acepta.';

-- Índice para buscar tokens activos de un usuario
-- Usado en logout: "revocá todos los tokens activos de este usuario"
CREATE INDEX idx_refresh_tokens_user
  ON refresh_tokens (user_id)
  WHERE revoked = false;

-- Índice para la verificación en /auth/refresh
-- La búsqueda por hash es la operación más frecuente de esta tabla
CREATE INDEX idx_refresh_tokens_hash
  ON refresh_tokens (token_hash)
  WHERE revoked = false;

COMMENT ON INDEX idx_refresh_tokens_user IS 'Optimiza la búsqueda de tokens activos por usuario en logout.';
COMMENT ON INDEX idx_refresh_tokens_hash IS 'Optimiza la verificación del refresh token en /auth/refresh.';

-- RLS
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- Cada usuario solo puede ver sus propios refresh tokens
-- NestJS con service_role_key bypassa esto — la política es
-- una segunda línea de defensa si algo accede directo a Supabase
CREATE POLICY "owner_only" ON refresh_tokens
  FOR ALL USING (
    user_id IN (
      SELECT id FROM users
      WHERE organization_id = public.jwt_organization_id()
    )
  );
