-- ============================================================
-- Migración 011: Mejoras al módulo de Portadosímetros (Holder Dosimeters)
-- - Columnas adicionales: model, storage_location, updated_at
-- - Permisos del módulo: holders:create, holders:read, holders:update, holders:delete
-- ============================================================

-- 1. Nuevas columnas para holder_dosimeters
ALTER TABLE holder_dosimeters
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS storage_location text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

COMMENT ON COLUMN holder_dosimeters.model IS 'Modelo físico del chasis portadosímetro (ej. UD-802, Harshaw, Genérico).';
COMMENT ON COLUMN holder_dosimeters.storage_location IS 'Ubicación física en el almacén o laboratorio (ej. Bandeja A-01, Estante 2).';
COMMENT ON COLUMN holder_dosimeters.updated_at IS 'Fecha y hora de última modificación del registro.';

-- 2. Trigger para actualizar automáticamente updated_at
CREATE OR REPLACE FUNCTION update_holder_dosimeters_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_holder_dosimeters_updated_at ON holder_dosimeters;
CREATE TRIGGER trg_holder_dosimeters_updated_at
  BEFORE UPDATE ON holder_dosimeters
  FOR EACH ROW
  EXECUTE FUNCTION update_holder_dosimeters_timestamp();

-- 3. Catálogo de Permisos formales para holders
INSERT INTO permissions (code, module, action, description) VALUES
  ('holders:create', 'holders', 'create', 'Registrar y dar de alta portadosímetros con código de barras'),
  ('holders:read',   'holders', 'read',   'Ver catálogo, detalle y realizar búsquedas de portadosímetros'),
  ('holders:update', 'holders', 'update', 'Editar condición física, estado operativo y notas de portadosímetros'),
  ('holders:delete', 'holders', 'delete', 'Dar de baja o retirar portadosímetros del inventario')
ON CONFLICT (code) DO NOTHING;

-- 4. Asignar los nuevos permisos a los usuarios que ya tienen permisos de dosímetros equivalentes
-- Para que ningún usuario activo con permisos pierda acceso
DO $$
DECLARE
  rec RECORD;
BEGIN
  -- Asignar holders:create a quienes pertenecen al laboratorio y tienen dosimeters:create
  FOR rec IN 
    SELECT up.user_id, up.granted_by
    FROM user_permissions up
    JOIN permissions p ON p.id = up.permission_id
    JOIN users u ON u.id = up.user_id
    JOIN organizations o ON o.id = u.organization_id
    WHERE p.code = 'dosimeters:create' AND up.granted = true AND o.type = 'laboratory'
  LOOP
    INSERT INTO user_permissions (user_id, permission_id, granted, granted_by)
    SELECT rec.user_id, p.id, true, rec.granted_by
    FROM permissions p
    WHERE p.code = 'holders:create'
    ON CONFLICT (user_id, permission_id) DO UPDATE SET granted = true;
  END LOOP;

  -- Asignar holders:read a quienes pertenecen al laboratorio y tienen dosimeters:read
  FOR rec IN 
    SELECT up.user_id, up.granted_by
    FROM user_permissions up
    JOIN permissions p ON p.id = up.permission_id
    JOIN users u ON u.id = up.user_id
    JOIN organizations o ON o.id = u.organization_id
    WHERE p.code = 'dosimeters:read' AND up.granted = true AND o.type = 'laboratory'
  LOOP
    INSERT INTO user_permissions (user_id, permission_id, granted, granted_by)
    SELECT rec.user_id, p.id, true, rec.granted_by
    FROM permissions p
    WHERE p.code = 'holders:read'
    ON CONFLICT (user_id, permission_id) DO UPDATE SET granted = true;
  END LOOP;

  -- Asignar holders:update a quienes pertenecen al laboratorio y tienen dosimeters:update
  FOR rec IN 
    SELECT up.user_id, up.granted_by
    FROM user_permissions up
    JOIN permissions p ON p.id = up.permission_id
    JOIN users u ON u.id = up.user_id
    JOIN organizations o ON o.id = u.organization_id
    WHERE p.code = 'dosimeters:update' AND up.granted = true AND o.type = 'laboratory'
  LOOP
    INSERT INTO user_permissions (user_id, permission_id, granted, granted_by)
    SELECT rec.user_id, p.id, true, rec.granted_by
    FROM permissions p
    WHERE p.code = 'holders:update'
    ON CONFLICT (user_id, permission_id) DO UPDATE SET granted = true;
  END LOOP;

  -- Asignar holders:delete a quienes pertenecen al laboratorio y tienen dosimeters:delete
  FOR rec IN 
    SELECT up.user_id, up.granted_by
    FROM user_permissions up
    JOIN permissions p ON p.id = up.permission_id
    JOIN users u ON u.id = up.user_id
    JOIN organizations o ON o.id = u.organization_id
    WHERE p.code = 'dosimeters:delete' AND up.granted = true AND o.type = 'laboratory'
  LOOP
    INSERT INTO user_permissions (user_id, permission_id, granted, granted_by)
    SELECT rec.user_id, p.id, true, rec.granted_by
    FROM permissions p
    WHERE p.code = 'holders:delete'
    ON CONFLICT (user_id, permission_id) DO UPDATE SET granted = true;
  END LOOP;
END $$;
