-- ============================================================
-- Migración 014: Corrección de caracteres con tildes / UTF-8
-- ============================================================
-- Corrige registros del catálogo y permisos que sufrieron
-- degradación a ASCII ('?') durante ejecuciones anteriores en PowerShell.
-- ============================================================

BEGIN;

-- 1. Catálogo de tipos de dosímetro
UPDATE dosimeter_types
SET name = 'TLD de Área (Salas / Búnkeres)'
WHERE code = 'TLD_AREA';

UPDATE dosimeter_types
SET name = 'Control de Envío / Viajero (Sombra)'
WHERE code = 'CONTROL_ENVIO_VIAJERO';

UPDATE dosimeter_types
SET name = 'Control de Calibración (UCR/CICAM)'
WHERE code = 'CONTROL_CALIBRACION';

-- 2. Catálogo de Roles del Sistema
UPDATE roles
SET name = 'Oficial de Protección Radiológica'
WHERE code = 'oficial_proteccion_radiologica';

UPDATE roles
SET name = 'Encargado de Protección Radiológica'
WHERE code = 'encargado_proteccion_radiologica';

UPDATE roles
SET name = 'Personal Logístico / Administrativo'
WHERE code = 'personal_logistico';

-- 3. Catálogo de Permisos
UPDATE permissions
SET description = 'Registrar y dar de alta portadosímetros con código de barras'
WHERE code = 'holders:create';

UPDATE permissions
SET description = 'Ver catálogo, detalle y realizar búsquedas de portadosímetros'
WHERE code = 'holders:read';

UPDATE permissions
SET description = 'Editar condición física, estado operativo y notas de portadosímetros'
WHERE code = 'holders:update';

UPDATE permissions
SET description = 'Dar de baja o retirar portadosímetros del inventario'
WHERE code = 'holders:delete';

-- 4. Notas de ensamblajes de prueba
UPDATE holder_tld_assemblies
SET notes = 'Ensamble para prueba de dosis crítica'
WHERE notes LIKE 'Ensamble para prueba de dosis cr%tica';

COMMIT;
