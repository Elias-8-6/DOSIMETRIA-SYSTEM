-- ============================================================
-- MIGRACIÓN 009 — Seed data para desarrollo
-- Datos mínimos para poder levantar y probar el sistema.
-- NO ejecutar en producción — usar datos reales.
-- ============================================================

-- ------------------------------------------------------------
-- Organización del laboratorio
-- ------------------------------------------------------------
INSERT INTO organizations (id, name, legal_id, type) VALUES
  ('00000000-0000-0000-0000-000000000001',
   'Laboratorio de Dosimetría Central',
   'LAB-001',
   'laboratory');

-- ------------------------------------------------------------
-- Sede principal del laboratorio
-- ------------------------------------------------------------
INSERT INTO laboratory_sites (id, organization_id, name, address, status) VALUES
  ('00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000001',
   'Sede Principal',
   'Av. Principal 123',
   'active');

-- ------------------------------------------------------------
-- Áreas de la sede principal
-- ------------------------------------------------------------
INSERT INTO areas (laboratory_site_id, name, area_type) VALUES
  ('00000000-0000-0000-0000-000000000010', 'Área de recepción',     'recepcion'),
  ('00000000-0000-0000-0000-000000000010', 'Sala limpia A',         'sala_limpia'),
  ('00000000-0000-0000-0000-000000000010', 'Sala de lectura TLD',   'sala_lectura'),
  ('00000000-0000-0000-0000-000000000010', 'Sala de armado',        'sala_armado'),
  ('00000000-0000-0000-0000-000000000010', 'Sala de QC',            'sala_qc');

-- ------------------------------------------------------------
-- Pasos de proceso para PROC_LECTURA (ejemplo completo)
-- ------------------------------------------------------------
INSERT INTO process_steps (process_definition_id, step_order, code, name, step_type, requires_equipment, requires_qc)
SELECT
  pd.id,
  paso.step_order,
  paso.code,
  paso.name,
  paso.step_type,
  paso.requires_equipment,
  paso.requires_qc
FROM process_definitions pd
CROSS JOIN (VALUES
  (1, 'PASO_INSPECCION',  'Inspección visual',            'inspeccion', false, false),
  (2, 'PASO_DESARMADO',   'Desarmado del dosímetro',      'desarmado',  false, false),
  (3, 'PASO_LIMPIEZA',    'Limpieza de componentes',      'limpieza',   false, false),
  (4, 'PASO_LECTURA',     'Lectura en equipo TLD',        'lectura',    true,  true),
  (5, 'PASO_QC',          'Control de calidad',           'qc',         true,  true),
  (6, 'PASO_ARMADO',      'Armado con material virgen',   'armado',     false, false),
  (7, 'PASO_REGISTRO',    'Registro de resultados',       'registro',   false, false)
) AS paso(step_order, code, name, step_type, requires_equipment, requires_qc)
WHERE pd.code = 'PROC_LECTURA';

-- ------------------------------------------------------------
-- Usuario administrador inicial
-- IMPORTANTE: cambiar password_hash antes de usar en producción
-- Hash bcrypt de 'admin123' — generado por NestJS al inicializar
-- ------------------------------------------------------------
INSERT INTO users (id, organization_id, full_name, email, password_hash, status) VALUES
  ('00000000-0000-0000-0000-000000000100',
   '00000000-0000-0000-0000-000000000001',
   'Administrador del Sistema',
   'admin@laboratorio.com',
   '$2b$10$zceixwHghqTIIu5MFdpyq.K9gT/t8oXEi.4ZAp0m0CehdBXmedUQ.',
   'active');

-- Asignar rol admin_lab al usuario inicial
INSERT INTO user_roles (user_id, role_id)
SELECT
  '00000000-0000-0000-0000-000000000100',
  id
FROM roles
WHERE code = 'admin_lab';

-- ------------------------------------------------------------
-- Organización e institución cliente de ejemplo
-- ------------------------------------------------------------
INSERT INTO organizations (id, name, legal_id, type) VALUES
  ('00000000-0000-0000-0000-000000000002',
   'Hospital General San Rafael',
   'HOSP-SGR-001',
   'client');

INSERT INTO clients (id, organization_id, code, name, contact_name, contact_email) VALUES
  ('00000000-0000-0000-0000-000000000020',
   '00000000-0000-0000-0000-000000000002',
   'HOSP-001',
   'Hospital General San Rafael',
   'Dr. Martínez',
   'dosimetria@hospitalsanrafael.com');

INSERT INTO client_locations (client_id, name, address) VALUES
  ('00000000-0000-0000-0000-000000000020', 'Área de Rayos X',     'Piso 1, Ala Norte'),
  ('00000000-0000-0000-0000-000000000020', 'Área de Radioterapia', 'Piso 2, Ala Sur');
