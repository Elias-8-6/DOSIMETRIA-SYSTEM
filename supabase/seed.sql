-- ============================================================
-- SEED — Dataset de desarrollo/staging con trazabilidad ISO 17025
--
-- Ejecutado automáticamente por `npx supabase db reset`
-- (configurado en supabase/config.toml: sql_paths = ["./seed.sql"])
--
-- ARQUITECTURA MULTI-TENANT:
--   Org laboratorio: 00000000-0000-0000-0000-000000000001 (type='laboratory')
--   Org Hospital:    00000000-0000-0000-0000-000000000002 (type='client')
--   Org Clínica:     00000000-0000-0000-0000-000000000003 (type='client')
--   Org Industria:   00000000-0000-0000-0000-000000000004 (type='client')
--
-- TODOS los clientes, trabajadores y dosímetros pertenecen a la
-- organización del LABORATORIO (org ...0001). Este es el modelo
-- correcto: el laboratorio gestiona su propio inventario de
-- dosímetros y los clientes son entidades externas que solicitan
-- el servicio. Los objetos de negocio son del lab, no de la org del cliente.
--
-- CORRECCIÓN CRÍTICA vs seed anterior (009):
--   El bug original asignaba clients.organization_id = ...0002 (la org del
--   cliente), lo que impedía que admin@laboratorio.com (org ...0001) viera
--   los clientes. En este seed todos los clientes tienen
--   organization_id = ...0001.
-- ============================================================

-- ============================================================
-- ORGANIZACIONES
-- ============================================================

INSERT INTO organizations (id, name, legal_id, type, status) VALUES
  ('00000000-0000-0000-0000-000000000001',
   'Laboratorio de Dosimetría Central',
   'LAB-CDO-001',
   'laboratory',
   'active'),
  ('00000000-0000-0000-0000-000000000002',
   'Hospital General San Rafael',
   'HOSP-SGR-001',
   'client',
   'active'),
  ('00000000-0000-0000-0000-000000000003',
   'Clínica Radiológica del Norte',
   'CLIN-RDN-001',
   'client',
   'active'),
  ('00000000-0000-0000-0000-000000000004',
   'Industrias Nucleares del Sur S.A.',
   'IND-NUS-001',
   'client',
   'active');

-- ============================================================
-- SEDE Y ÁREAS DEL LABORATORIO
-- ============================================================

INSERT INTO laboratory_sites (id, organization_id, name, address, status) VALUES
  ('00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000001',
   'Sede Principal — Centro de Dosimetría',
   'Av. de la Ciencia 1450, Piso 3, Edificio Tecnológico',
   'active');

INSERT INTO areas (id, laboratory_site_id, name, area_type, status) VALUES
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', 'Área de Recepción e Inspección', 'recepcion',    'active'),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000010', 'Sala Limpia A — Desarmado',       'sala_limpia',  'active'),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000010', 'Sala de Lectura TLD/OSL',         'sala_lectura', 'active'),
  ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000010', 'Sala de Armado y Empaque',        'sala_armado',  'active'),
  ('00000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000010', 'Sala de Control de Calidad',      'sala_qc',      'active'),
  ('00000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000010', 'Almacén de Dosímetros',           'almacen',      'active');

-- ============================================================
-- EQUIPOS DEL LABORATORIO
-- ============================================================

INSERT INTO equipment (
  id, laboratory_site_id, code, name, model, serial_number,
  equipment_type, status, manufacturer, commissioning_date,
  calibration_interval_days
) VALUES
  ('00000000-0000-0000-0000-000000000030',
   '00000000-0000-0000-0000-000000000010',
   'EQ-TLD-001',
   'Lector TLD Harshaw 6600',
   'Harshaw 6600',
   'SN-TLD-6600-A1029',
   'lector_tld',
   'operativo',
   'Thermo Fisher Scientific',
   '2022-03-15',
   365),
  ('00000000-0000-0000-0000-000000000031',
   '00000000-0000-0000-0000-000000000010',
   'EQ-CONT-001',
   'Detector de Contaminación Ludlum 2241-3',
   'Ludlum 2241-3',
   'SN-LUD-2241-B0847',
   'detector_contaminacion',
   'operativo',
   'Ludlum Measurements Inc.',
   '2023-01-10',
   365);

INSERT INTO equipment_calibrations (
  id, equipment_id, calibration_date, next_due_date, provider,
  certificate_number, result, certificate_url
) VALUES
  ('00000000-0000-0000-0000-000000000040',
   '00000000-0000-0000-0000-000000000030',
   '2026-01-15',
   '2027-01-15',
   'Instituto Nacional de Metrología',
   'CAL-INM-2026-00341',
   'aprobado',
   'storage/calibrations/CAL-INM-2026-00341.pdf'),
  ('00000000-0000-0000-0000-000000000041',
   '00000000-0000-0000-0000-000000000031',
   '2026-02-20',
   '2027-02-20',
   'Instituto Nacional de Metrología',
   'CAL-INM-2026-00482',
   'aprobado',
   'storage/calibrations/CAL-INM-2026-00482.pdf');

-- ============================================================
-- PASOS DE PROCESO PARA PROC_LECTURA
-- ============================================================

INSERT INTO process_steps (
  process_definition_id, step_order, code, name, step_type, requires_equipment, requires_qc
)
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
  (1, 'PASO_INSPECCION', 'Inspección visual y registro de condición', 'inspeccion', false, false),
  (2, 'PASO_DESARMADO',  'Desarmado del dosímetro TLD',               'desarmado',  false, false),
  (3, 'PASO_LIMPIEZA',   'Limpieza de componentes con ultrasonido',   'limpieza',   false, false),
  (4, 'PASO_LECTURA',    'Lectura termoluminiscente en equipo TLD',   'lectura',    true,  true),
  (5, 'PASO_QC',         'Control de calidad con patrón referencia',  'qc',         true,  true),
  (6, 'PASO_ARMADO',     'Armado con material TLD virgen',            'armado',     false, false),
  (7, 'PASO_REGISTRO',   'Registro de resultados en sistema',         'registro',   false, false)
) AS paso(step_order, code, name, step_type, requires_equipment, requires_qc)
WHERE pd.code = 'PROC_LECTURA';

-- ============================================================
-- USUARIOS DEL SISTEMA
-- ============================================================
-- Contraseña de todos: Admin123!@#$ (solo desarrollo)
-- Hash: $2b$10$RskUD4Aa6nd8jljqvuFvT.LtgsRm6xMqnBYlm/IlqhOXooSxgTiVm

INSERT INTO users (
  id, organization_id, full_name, email, password_hash, status,
  degree_title, document_number, hire_date, phone
) VALUES
  -- Administrador del laboratorio
  ('00000000-0000-0000-0000-000000000100',
   '00000000-0000-0000-0000-000000000001',
   'Dr. Alejandro Vargas Molina',
   'admin@laboratorio.com',
   '$2b$10$RskUD4Aa6nd8jljqvuFvT.LtgsRm6xMqnBYlm/IlqhOXooSxgTiVm',
   'active',
   'Doctor en Física Médica',
   '12345678',
   '2018-03-01',
   '+57 301 555 0100'),
  -- Técnico de laboratorio 1
  ('00000000-0000-0000-0000-000000000101',
   '00000000-0000-0000-0000-000000000001',
   'Lic. María Fernanda Ospina Torres',
   'tecnico1@laboratorio.com',
   '$2b$10$RskUD4Aa6nd8jljqvuFvT.LtgsRm6xMqnBYlm/IlqhOXooSxgTiVm',
   'active',
   'Licenciada en Física',
   '23456789',
   '2020-06-15',
   '+57 302 555 0101'),
  -- Técnico de laboratorio 2
  ('00000000-0000-0000-0000-000000000102',
   '00000000-0000-0000-0000-000000000001',
   'Ing. Carlos Andrés Ríos Peña',
   'tecnico2@laboratorio.com',
   '$2b$10$RskUD4Aa6nd8jljqvuFvT.LtgsRm6xMqnBYlm/IlqhOXooSxgTiVm',
   'active',
   'Ingeniero en Radiaciones Ionizantes',
   '34567890',
   '2021-09-01',
   '+57 303 555 0102'),
  -- Auditor ISO
  ('00000000-0000-0000-0000-000000000103',
   '00000000-0000-0000-0000-000000000001',
   'Dra. Patricia Lozano Herrera',
   'auditora@laboratorio.com',
   '$2b$10$RskUD4Aa6nd8jljqvuFvT.LtgsRm6xMqnBYlm/IlqhOXooSxgTiVm',
   'active',
   'Doctora en Protección Radiológica',
   '45678901',
   '2019-01-10',
   '+57 304 555 0103');

-- Asignación de roles
INSERT INTO user_roles (user_id, role_id)
SELECT '00000000-0000-0000-0000-000000000100'::uuid, id FROM roles WHERE code = 'admin_lab'
UNION ALL
SELECT '00000000-0000-0000-0000-000000000101'::uuid, id FROM roles WHERE code = 'tecnico_lab'
UNION ALL
SELECT '00000000-0000-0000-0000-000000000102'::uuid, id FROM roles WHERE code = 'tecnico_lab'
UNION ALL
SELECT '00000000-0000-0000-0000-000000000103'::uuid, id FROM roles WHERE code = 'auditor';

-- Todos los permisos al administrador
DO $$
DECLARE
  v_admin_id uuid;
  v_perm     record;
BEGIN
  v_admin_id := '00000000-0000-0000-0000-000000000100'::uuid;
  FOR v_perm IN SELECT id FROM permissions LOOP
    INSERT INTO user_permissions (user_id, permission_id, granted, granted_by)
    VALUES (v_admin_id, v_perm.id, true, v_admin_id)
    ON CONFLICT (user_id, permission_id) DO NOTHING;
  END LOOP;
END;
$$;

-- Permisos básicos para técnicos (lectura y escritura de su módulo)
DO $$
DECLARE
  v_tec1 uuid := '00000000-0000-0000-0000-000000000101';
  v_tec2 uuid := '00000000-0000-0000-0000-000000000102';
  v_admin uuid := '00000000-0000-0000-0000-000000000100';
  v_perm record;
BEGIN
  FOR v_perm IN
    SELECT id FROM permissions
    WHERE code IN (
      'clients:read', 'workers:read', 'dosimeters:read', 'dosimeters:update',
      'assignments:create', 'assignments:read', 'assignments:update',
      'service_orders:read', 'receptions:create', 'receptions:read',
      'lab_process:create', 'lab_process:read', 'lab_process:update',
      'readings:create', 'readings:read'
    )
  LOOP
    INSERT INTO user_permissions (user_id, permission_id, granted, granted_by)
    VALUES (v_tec1, v_perm.id, true, v_admin)
    ON CONFLICT (user_id, permission_id) DO NOTHING;
    INSERT INTO user_permissions (user_id, permission_id, granted, granted_by)
    VALUES (v_tec2, v_perm.id, true, v_admin)
    ON CONFLICT (user_id, permission_id) DO NOTHING;
  END LOOP;
END;
$$;

-- Permisos de auditoría a auditora
DO $$
DECLARE
  v_aud  uuid := '00000000-0000-0000-0000-000000000103';
  v_admin uuid := '00000000-0000-0000-0000-000000000100';
  v_perm record;
BEGIN
  FOR v_perm IN
    SELECT id FROM permissions
    WHERE code IN (
      'audit:read', 'clients:read', 'workers:read', 'dosimeters:read',
      'service_orders:read', 'readings:read', 'reports:read'
    )
  LOOP
    INSERT INTO user_permissions (user_id, permission_id, granted, granted_by)
    VALUES (v_aud, v_perm.id, true, v_admin)
    ON CONFLICT (user_id, permission_id) DO NOTHING;
  END LOOP;
END;
$$;

-- ============================================================
-- CLIENTES (todos con organization_id = LAB, corrección del bug)
-- ============================================================

INSERT INTO clients (
  id, organization_id, code, name, contact_name, contact_email,
  status, phone, address, client_type,
  contract_start_date, contract_end_date
) VALUES
  ('00000000-0000-0000-0000-000000000050',
   '00000000-0000-0000-0000-000000000001',
   'HOSP-001',
   'Hospital General San Rafael',
   'Dr. Javier Martínez Beltrán',
   'dosimetria@hospitalsanrafael.com',
   'active',
   '+57 1 555 0200',
   'Calle 50 #22-30, Bogotá D.C.',
   'hospital',
   '2024-01-01',
   '2026-12-31'),
  ('00000000-0000-0000-0000-000000000051',
   '00000000-0000-0000-0000-000000000001',
   'CLIN-001',
   'Clínica Radiológica del Norte',
   'Ing. Sandra Morales Quintero',
   'radioproteccion@clinicadelnorte.com',
   'active',
   '+57 1 555 0300',
   'Av. El Dorado 68C-61, Bogotá D.C.',
   'clinica',
   '2023-07-01',
   '2026-06-30'),
  ('00000000-0000-0000-0000-000000000052',
   '00000000-0000-0000-0000-000000000001',
   'IND-001',
   'Industrias Nucleares del Sur S.A.',
   'Fís. Roberto Acosta Prado',
   'seguridad.radiologica@indnuclsur.com',
   'active',
   '+57 4 555 0400',
   'Zona Industrial Mulaló, Km 12 vía Yumbo, Cali',
   'industria',
   '2025-01-01',
   '2027-12-31');

-- Sedes de los clientes
INSERT INTO client_locations (
  id, client_id, name, address, status,
  phone, contact_name, radiation_type, risk_level
) VALUES
  -- Hospital San Rafael
  ('00000000-0000-0000-0000-000000000060',
   '00000000-0000-0000-0000-000000000050',
   'Servicio de Radiología — Edificio Principal',
   'Piso 1, Ala Norte — Calle 50 #22-30',
   'active',
   '+57 1 555 0201',
   'Tec. Radiología Luis Gómez',
   'rayos_x',
   'alto'),
  ('00000000-0000-0000-0000-000000000061',
   '00000000-0000-0000-0000-000000000050',
   'Servicio de Radioterapia',
   'Piso 3, Torre B — Calle 50 #22-30',
   'active',
   '+57 1 555 0202',
   'Fís. Med. Ana Cifuentes',
   'gamma',
   'alto'),
  -- Clínica del Norte
  ('00000000-0000-0000-0000-000000000062',
   '00000000-0000-0000-0000-000000000051',
   'Sala de Rayos X Convencional',
   'Consulta Externa, Av. El Dorado 68C-61',
   'active',
   '+57 1 555 0301',
   'Enf. Valentina Torres',
   'rayos_x',
   'medio'),
  ('00000000-0000-0000-0000-000000000063',
   '00000000-0000-0000-0000-000000000051',
   'Unidad de Mamografía',
   'Segundo Piso, Av. El Dorado 68C-61',
   'active',
   '+57 1 555 0302',
   'Tec. Camila Restrepo',
   'rayos_x',
   'medio'),
  -- Industrias Nucleares
  ('00000000-0000-0000-0000-000000000064',
   '00000000-0000-0000-0000-000000000052',
   'Planta de Producción — Zona Controlada',
   'Km 12 vía Yumbo, Edificio C',
   'active',
   '+57 4 555 0401',
   'Ing. Nuclear Héctor Salcedo',
   'gamma',
   'alto');

-- ============================================================
-- TRABAJADORES (POE — Personal Ocupacionalmente Expuesto)
-- ============================================================

INSERT INTO workers (
  id, client_id, client_location_id, employee_code, full_name,
  document_number, status, date_of_birth, gender, phone,
  email, occupation, start_date
) VALUES
  -- Hospital San Rafael — Radiología
  ('00000000-0000-0000-0000-000000000070',
   '00000000-0000-0000-0000-000000000050',
   '00000000-0000-0000-0000-000000000060',
   'HOSP-RAD-001', 'Luis Eduardo Gómez Parra', '10001001', 'active',
   '1985-04-12', 'masculino', '+57 315 100 1001',
   'lgomez@hospitalsanrafael.com', 'Tecnólogo en Radiología', '2019-03-01'),
  ('00000000-0000-0000-0000-000000000071',
   '00000000-0000-0000-0000-000000000050',
   '00000000-0000-0000-0000-000000000060',
   'HOSP-RAD-002', 'Diana Milena Suárez Varón', '10001002', 'active',
   '1990-09-23', 'femenino', '+57 316 100 1002',
   'dsuarez@hospitalsanrafael.com', 'Tecnóloga en Radiología', '2021-02-15'),
  -- Hospital San Rafael — Radioterapia
  ('00000000-0000-0000-0000-000000000072',
   '00000000-0000-0000-0000-000000000050',
   '00000000-0000-0000-0000-000000000061',
   'HOSP-RTP-001', 'Ana Lucía Cifuentes Mora', '10002001', 'active',
   '1982-12-05', 'femenino', '+57 317 100 2001',
   'acifuentes@hospitalsanrafael.com', 'Física Médica', '2018-07-01'),
  ('00000000-0000-0000-0000-000000000073',
   '00000000-0000-0000-0000-000000000050',
   '00000000-0000-0000-0000-000000000061',
   'HOSP-RTP-002', 'Jorge Armando Castillo Ruiz', '10002002', 'active',
   '1988-06-17', 'masculino', '+57 318 100 2002',
   'jcastillo@hospitalsanrafael.com', 'Tecnólogo en Radioterapia', '2020-09-01'),
  -- Clínica del Norte — Rayos X
  ('00000000-0000-0000-0000-000000000074',
   '00000000-0000-0000-0000-000000000051',
   '00000000-0000-0000-0000-000000000062',
   'CLIN-RX-001', 'Valentina Torres Díaz', '20001001', 'active',
   '1992-03-30', 'femenino', '+57 319 200 1001',
   'vtorres@clinicadelnorte.com', 'Enfermera Instrumentista', '2022-01-10'),
  ('00000000-0000-0000-0000-000000000075',
   '00000000-0000-0000-0000-000000000051',
   '00000000-0000-0000-0000-000000000062',
   'CLIN-RX-002', 'Pedro Antonio Herrera Silva', '20001002', 'active',
   '1987-11-08', 'masculino', '+57 320 200 1002',
   'pherrera@clinicadelnorte.com', 'Médico Radiólogo', '2021-08-01'),
  -- Clínica del Norte — Mamografía
  ('00000000-0000-0000-0000-000000000076',
   '00000000-0000-0000-0000-000000000051',
   '00000000-0000-0000-0000-000000000063',
   'CLIN-MAM-001', 'Camila Andrea Restrepo Vélez', '20002001', 'active',
   '1995-07-14', 'femenino', '+57 321 200 2001',
   'crestrepo@clinicadelnorte.com', 'Tecnóloga en Mamografía', '2023-04-01'),
  -- Industrias Nucleares — Planta
  ('00000000-0000-0000-0000-000000000077',
   '00000000-0000-0000-0000-000000000052',
   '00000000-0000-0000-0000-000000000064',
   'IND-PLANT-001', 'Héctor Javier Salcedo Pinto', '30001001', 'active',
   '1978-02-20', 'masculino', '+57 322 300 1001',
   'hsalcedo@indnuclsur.com', 'Ingeniero Nuclear', '2017-01-05'),
  ('00000000-0000-0000-0000-000000000078',
   '00000000-0000-0000-0000-000000000052',
   '00000000-0000-0000-0000-000000000064',
   'IND-PLANT-002', 'Gloria Inés Ramírez Castro', '30001002', 'active',
   '1983-10-01', 'femenino', '+57 323 300 1002',
   'gramirez@indnuclsur.com', 'Técnica en Protección Radiológica', '2019-06-15'),
  ('00000000-0000-0000-0000-000000000079',
   '00000000-0000-0000-0000-000000000052',
   '00000000-0000-0000-0000-000000000064',
   'IND-PLANT-003', 'David Santiago Mosquera Arboleda', '30001003', 'active',
   '1991-08-25', 'masculino', '+57 324 300 1003',
   'dmosquera@indnuclsur.com', 'Operador de Planta', '2022-03-01');

-- ============================================================
-- DOSÍMETROS (activo del laboratorio, con model y manufacturer)
-- ============================================================

-- Función auxiliar para obtener IDs de status por código
DO $$
DECLARE
  v_disponible  uuid;
  v_asignado    uuid;
  v_en_lab      uuid;
  v_procesado   uuid;
  v_baja        uuid;
  v_tld_p_id    uuid;
  v_tld_a_id    uuid;
  v_osl_p_id    uuid;
BEGIN
  SELECT id INTO v_disponible FROM dosimeter_statuses WHERE code = 'DISPONIBLE';
  SELECT id INTO v_asignado   FROM dosimeter_statuses WHERE code = 'ASIGNADO';
  SELECT id INTO v_en_lab     FROM dosimeter_statuses WHERE code = 'EN_LAB';
  SELECT id INTO v_procesado  FROM dosimeter_statuses WHERE code = 'PROCESADO';
  SELECT id INTO v_baja       FROM dosimeter_statuses WHERE code = 'BAJA';
  SELECT id INTO v_tld_p_id   FROM dosimeter_types WHERE code = 'TLD_PERSONAL';
  SELECT id INTO v_tld_a_id   FROM dosimeter_types WHERE code = 'TLD_AREA';
  SELECT id INTO v_osl_p_id   FROM dosimeter_types WHERE code = 'OSL_PERSONAL';

  -- Dosímetros TLD Personales — Thermo Fisher Harshaw 8807
  INSERT INTO dosimeters (
    id, dosimeter_type_id, status_id, serial_number, internal_code,
    lot_number, manufacture_date, commissioning_date, current_condition,
    reusable, wear_period_days, max_dose_limit, model, manufacturer
  ) VALUES
    ('00000000-0000-0000-0000-000000000200', v_tld_p_id, v_asignado,   'TF-8807-001001', 'LAB-TLD-001', 'LOT-2024-A', '2024-01-15', '2024-02-01', 'normal', true, 30, 50, 'Harshaw 8807', 'Thermo Fisher Scientific'),
    ('00000000-0000-0000-0000-000000000201', v_tld_p_id, v_asignado,   'TF-8807-001002', 'LAB-TLD-002', 'LOT-2024-A', '2024-01-15', '2024-02-01', 'normal', true, 30, 50, 'Harshaw 8807', 'Thermo Fisher Scientific'),
    ('00000000-0000-0000-0000-000000000202', v_tld_p_id, v_asignado,   'TF-8807-001003', 'LAB-TLD-003', 'LOT-2024-A', '2024-01-15', '2024-02-01', 'normal', true, 30, 50, 'Harshaw 8807', 'Thermo Fisher Scientific'),
    ('00000000-0000-0000-0000-000000000203', v_tld_p_id, v_asignado,   'TF-8807-001004', 'LAB-TLD-004', 'LOT-2024-A', '2024-01-15', '2024-02-01', 'normal', true, 30, 50, 'Harshaw 8807', 'Thermo Fisher Scientific'),
    ('00000000-0000-0000-0000-000000000204', v_tld_p_id, v_asignado,   'TF-8807-001005', 'LAB-TLD-005', 'LOT-2024-A', '2024-01-15', '2024-02-01', 'normal', true, 30, 50, 'Harshaw 8807', 'Thermo Fisher Scientific'),
    ('00000000-0000-0000-0000-000000000205', v_tld_p_id, v_asignado,   'TF-8807-001006', 'LAB-TLD-006', 'LOT-2024-B', '2024-03-01', '2024-04-01', 'normal', true, 30, 50, 'Harshaw 8807', 'Thermo Fisher Scientific'),
    ('00000000-0000-0000-0000-000000000206', v_tld_p_id, v_asignado,   'TF-8807-001007', 'LAB-TLD-007', 'LOT-2024-B', '2024-03-01', '2024-04-01', 'normal', true, 30, 50, 'Harshaw 8807', 'Thermo Fisher Scientific'),
    ('00000000-0000-0000-0000-000000000207', v_tld_p_id, v_asignado,   'TF-8807-001008', 'LAB-TLD-008', 'LOT-2024-B', '2024-03-01', '2024-04-01', 'normal', true, 30, 50, 'Harshaw 8807', 'Thermo Fisher Scientific'),
    ('00000000-0000-0000-0000-000000000208', v_tld_p_id, v_disponible, 'TF-8807-001009', 'LAB-TLD-009', 'LOT-2024-B', '2024-03-01', '2024-04-01', 'normal', true, 30, 50, 'Harshaw 8807', 'Thermo Fisher Scientific'),
    ('00000000-0000-0000-0000-000000000209', v_tld_p_id, v_disponible, 'TF-8807-001010', 'LAB-TLD-010', 'LOT-2024-B', '2024-03-01', '2024-04-01', 'normal', true, 30, 50, 'Harshaw 8807', 'Thermo Fisher Scientific'),
    -- Dosímetros OSL Personal — Landauer Luxel+
    ('00000000-0000-0000-0000-000000000210', v_osl_p_id, v_asignado,   'LDR-LUXEL-002001', 'LAB-OSL-001', 'LOT-2024-C', '2024-06-01', '2024-07-01', 'normal', true, 90, 100, 'Luxel+',      'Landauer Inc.'),
    ('00000000-0000-0000-0000-000000000211', v_osl_p_id, v_asignado,   'LDR-LUXEL-002002', 'LAB-OSL-002', 'LOT-2024-C', '2024-06-01', '2024-07-01', 'normal', true, 90, 100, 'Luxel+',      'Landauer Inc.'),
    ('00000000-0000-0000-0000-000000000212', v_osl_p_id, v_asignado,   'LDR-LUXEL-002003', 'LAB-OSL-003', 'LOT-2024-C', '2024-06-01', '2024-07-01', 'normal', true, 90, 100, 'Luxel+',      'Landauer Inc.'),
    ('00000000-0000-0000-0000-000000000213', v_osl_p_id, v_disponible, 'LDR-LUXEL-002004', 'LAB-OSL-004', 'LOT-2024-C', '2024-06-01', '2024-07-01', 'normal', true, 90, 100, 'Luxel+',      'Landauer Inc.'),
    -- Dosímetros TLD de Área — Panasonic UD-814
    ('00000000-0000-0000-0000-000000000220', v_tld_a_id, v_disponible, 'PAN-UD814-003001', 'LAB-AREA-001', 'LOT-2025-A', '2025-01-01', '2025-02-01', 'normal', true, 90, 200, 'UD-814',      'Panasonic Corporation'),
    ('00000000-0000-0000-0000-000000000221', v_tld_a_id, v_disponible, 'PAN-UD814-003002', 'LAB-AREA-002', 'LOT-2025-A', '2025-01-01', '2025-02-01', 'normal', true, 90, 200, 'UD-814',      'Panasonic Corporation'),
    -- Dosímetros en laboratorio (ciclo completado)
    ('00000000-0000-0000-0000-000000000230', v_tld_p_id, v_procesado, 'TF-8807-000101', 'LAB-TLD-H01', 'LOT-2023-Z', '2023-06-01', '2023-07-01', 'normal', true, 30, 50, 'Harshaw 8807', 'Thermo Fisher Scientific'),
    ('00000000-0000-0000-0000-000000000231', v_tld_p_id, v_procesado, 'TF-8807-000102', 'LAB-TLD-H02', 'LOT-2023-Z', '2023-06-01', '2023-07-01', 'normal', true, 30, 50, 'Harshaw 8807', 'Thermo Fisher Scientific'),
    -- Dosímetro dado de baja (dañado)
    ('00000000-0000-0000-0000-000000000240', v_tld_p_id, v_baja, 'TF-8807-999001', 'LAB-BAJA-001', 'LOT-2022-A', '2022-01-01', '2022-02-01', 'danado', false, 30, 50, 'Harshaw 8807', 'Thermo Fisher Scientific');

END;
$$;

-- ============================================================
-- ASIGNACIONES HISTÓRICAS (períodos cerrados)
-- ============================================================

INSERT INTO dosimeter_assignments (
  dosimeter_id, worker_id, assigned_at, returned_at, status, notes, assigned_by
) VALUES
  -- Período anterior (cerrado) — Hospital San Rafael
  ('00000000-0000-0000-0000-000000000200', '00000000-0000-0000-0000-000000000070', '2026-07-01', '2026-07-31', 'cerrado', 'Período julio 2026', '00000000-0000-0000-0000-000000000101'),
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000071', '2026-07-01', '2026-07-31', 'cerrado', 'Período julio 2026', '00000000-0000-0000-0000-000000000101'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000072', '2026-07-01', '2026-07-31', 'cerrado', 'Período julio 2026', '00000000-0000-0000-0000-000000000101'),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000073', '2026-07-01', '2026-07-31', 'cerrado', 'Período julio 2026', '00000000-0000-0000-0000-000000000101'),
  ('00000000-0000-0000-0000-000000000210', '00000000-0000-0000-0000-000000000077', '2026-04-01', '2026-06-30', 'cerrado', 'Q2 2026 — Industrias Nucleares', '00000000-0000-0000-0000-000000000102'),
  ('00000000-0000-0000-0000-000000000211', '00000000-0000-0000-0000-000000000078', '2026-04-01', '2026-06-30', 'cerrado', 'Q2 2026 — Industrias Nucleares', '00000000-0000-0000-0000-000000000102'),
  -- Dosímetros históricos procesados
  ('00000000-0000-0000-0000-000000000230', '00000000-0000-0000-0000-000000000074', '2026-06-01', '2026-06-30', 'cerrado', 'Período junio 2026 — Clínica Norte', '00000000-0000-0000-0000-000000000101'),
  ('00000000-0000-0000-0000-000000000231', '00000000-0000-0000-0000-000000000075', '2026-06-01', '2026-06-30', 'cerrado', 'Período junio 2026 — Clínica Norte', '00000000-0000-0000-0000-000000000101');

-- ============================================================
-- ASIGNACIONES ACTIVAS (período actual — agosto 2026)
-- ============================================================

INSERT INTO dosimeter_assignments (
  dosimeter_id, worker_id, assigned_at, returned_at, status, notes, assigned_by
) VALUES
  ('00000000-0000-0000-0000-000000000200', '00000000-0000-0000-0000-000000000070', '2026-08-01', NULL, 'activo', 'Período agosto 2026', '00000000-0000-0000-0000-000000000101'),
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000071', '2026-08-01', NULL, 'activo', 'Período agosto 2026', '00000000-0000-0000-0000-000000000101'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000072', '2026-08-01', NULL, 'activo', 'Período agosto 2026', '00000000-0000-0000-0000-000000000101'),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000073', '2026-08-01', NULL, 'activo', 'Período agosto 2026', '00000000-0000-0000-0000-000000000101'),
  ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000074', '2026-08-01', NULL, 'activo', 'Período agosto 2026', '00000000-0000-0000-0000-000000000102'),
  ('00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000075', '2026-08-01', NULL, 'activo', 'Período agosto 2026', '00000000-0000-0000-0000-000000000102'),
  ('00000000-0000-0000-0000-000000000206', '00000000-0000-0000-0000-000000000076', '2026-08-01', NULL, 'activo', 'Período agosto 2026', '00000000-0000-0000-0000-000000000102'),
  ('00000000-0000-0000-0000-000000000210', '00000000-0000-0000-0000-000000000077', '2026-07-01', NULL, 'activo', 'Q3 2026 — Industrias Nucleares (90 días)', '00000000-0000-0000-0000-000000000102'),
  ('00000000-0000-0000-0000-000000000211', '00000000-0000-0000-0000-000000000078', '2026-07-01', NULL, 'activo', 'Q3 2026 — Industrias Nucleares (90 días)', '00000000-0000-0000-0000-000000000102'),
  ('00000000-0000-0000-0000-000000000212', '00000000-0000-0000-0000-000000000079', '2026-07-01', NULL, 'activo', 'Q3 2026 — Industrias Nucleares (90 días)', '00000000-0000-0000-0000-000000000102'),
  ('00000000-0000-0000-0000-000000000207', '00000000-0000-0000-0000-000000000070', '2026-08-01', NULL, 'activo', 'Dosímetro extremidad — agosto 2026', '00000000-0000-0000-0000-000000000101');

-- ============================================================
-- ÓRDENES DE SERVICIO
-- ============================================================

INSERT INTO service_orders (
  id, client_id, order_number, service_type, status,
  requested_date, due_date, observations, created_by, priority
) VALUES
  -- Orden completada — Hospital julio 2026
  ('00000000-0000-0000-0000-000000000300',
   '00000000-0000-0000-0000-000000000050',
   'OS-2026-00001',
   'lectura_dosis',
   'COMPLETED',
   '2026-07-31',
   '2026-08-07',
   'Período de uso: julio 2026. Dosímetros TLD personales — Servicio de Radiología y Radioterapia.',
   '00000000-0000-0000-0000-000000000100',
   'normal'),
  -- Orden completada — Industrias Nucleares Q2 2026
  ('00000000-0000-0000-0000-000000000301',
   '00000000-0000-0000-0000-000000000052',
   'OS-2026-00002',
   'lectura_dosis',
   'COMPLETED',
   '2026-06-30',
   '2026-07-10',
   'Trimestre Q2 2026. Dosímetros OSL — Planta de producción zona controlada.',
   '00000000-0000-0000-0000-000000000100',
   'normal'),
  -- Orden activa — Clínica del Norte agosto 2026
  ('00000000-0000-0000-0000-000000000302',
   '00000000-0000-0000-0000-000000000051',
   'OS-2026-00003',
   'lectura_dosis',
   'IN_PROCESS',
   '2026-08-31',
   '2026-09-07',
   'Período agosto 2026. Dosímetros TLD — Rayos X y Mamografía.',
   '00000000-0000-0000-0000-000000000100',
   'normal');

-- Ítems de las órdenes
INSERT INTO service_order_items (service_order_id, dosimeter_id, requested_action, status) VALUES
  -- OS-2026-00001 (Hospital julio — completada)
  ('00000000-0000-0000-0000-000000000300', '00000000-0000-0000-0000-000000000200', 'lectura', 'COMPLETED'),
  ('00000000-0000-0000-0000-000000000300', '00000000-0000-0000-0000-000000000201', 'lectura', 'COMPLETED'),
  ('00000000-0000-0000-0000-000000000300', '00000000-0000-0000-0000-000000000202', 'lectura', 'COMPLETED'),
  ('00000000-0000-0000-0000-000000000300', '00000000-0000-0000-0000-000000000203', 'lectura', 'COMPLETED'),
  -- OS-2026-00002 (Industrias Q2 — completada)
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000210', 'lectura', 'COMPLETED'),
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000211', 'lectura', 'COMPLETED'),
  -- OS-2026-00003 (Clínica agosto — en proceso)
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000230', 'lectura', 'IN_PROCESS'),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000231', 'lectura', 'IN_PROCESS');

-- ============================================================
-- RECEPCIONES Y LOTES
-- ============================================================

INSERT INTO receptions (
  id, service_order_id, received_by, received_at,
  reception_code, packaging_condition, observations
) VALUES
  ('00000000-0000-0000-0000-000000000400',
   '00000000-0000-0000-0000-000000000300',
   '00000000-0000-0000-0000-000000000101',
   '2026-08-01 09:15:00-05',
   'REC-2026-00001',
   'integro',
   'Paquete recibido en perfectas condiciones. 4 dosímetros TLD personal.'),
  ('00000000-0000-0000-0000-000000000401',
   '00000000-0000-0000-0000-000000000301',
   '00000000-0000-0000-0000-000000000102',
   '2026-07-01 10:30:00-05',
   'REC-2026-00002',
   'integro',
   'Paquete sellado recibido. 2 dosímetros OSL trimestrales.');

INSERT INTO reception_items (
  reception_id, dosimeter_id, received_condition,
  sealed, contaminated, observations, condition_photo_url
) VALUES
  -- Recepción OS-00001
  ('00000000-0000-0000-0000-000000000400', '00000000-0000-0000-0000-000000000200', 'normal', true, false, NULL, 'storage/reception/REC-2026-00001-D200.jpg'),
  ('00000000-0000-0000-0000-000000000400', '00000000-0000-0000-0000-000000000201', 'normal', true, false, NULL, 'storage/reception/REC-2026-00001-D201.jpg'),
  ('00000000-0000-0000-0000-000000000400', '00000000-0000-0000-0000-000000000202', 'normal', true, false, NULL, 'storage/reception/REC-2026-00001-D202.jpg'),
  ('00000000-0000-0000-0000-000000000400', '00000000-0000-0000-0000-000000000203', 'danado_fisico', true, false, 'Pequeña abrasión en esquina inferior derecha del portabadge. No compromete integridad del TLD.', 'storage/reception/REC-2026-00001-D203-dano.jpg'),
  -- Recepción OS-00002
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000210', 'normal', true, false, NULL, 'storage/reception/REC-2026-00002-D210.jpg'),
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000211', 'normal', true, false, NULL, 'storage/reception/REC-2026-00002-D211.jpg');

INSERT INTO lab_batches (
  id, service_order_id, reception_id, batch_code, batch_type, status
) VALUES
  ('00000000-0000-0000-0000-000000000500',
   '00000000-0000-0000-0000-000000000300',
   '00000000-0000-0000-0000-000000000400',
   'LOT-2026-00001',
   'lectura',
   'COMPLETADO'),
  ('00000000-0000-0000-0000-000000000501',
   '00000000-0000-0000-0000-000000000301',
   '00000000-0000-0000-0000-000000000401',
   'LOT-2026-00002',
   'lectura',
   'COMPLETADO');

INSERT INTO batch_items (lab_batch_id, dosimeter_id, status) VALUES
  ('00000000-0000-0000-0000-000000000500', '00000000-0000-0000-0000-000000000200', 'COMPLETADO'),
  ('00000000-0000-0000-0000-000000000500', '00000000-0000-0000-0000-000000000201', 'COMPLETADO'),
  ('00000000-0000-0000-0000-000000000500', '00000000-0000-0000-0000-000000000202', 'COMPLETADO'),
  ('00000000-0000-0000-0000-000000000500', '00000000-0000-0000-0000-000000000203', 'COMPLETADO'),
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000210', 'COMPLETADO'),
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000211', 'COMPLETADO');

-- ============================================================
-- LECTURAS DE DOSIS (período julio 2026)
-- ============================================================

INSERT INTO dosimeter_readings (
  dosimeter_id, service_order_id, equipment_id, read_at,
  measured_dose, dose_unit, uncertainty, reading_status,
  hp10, hp007, background_dose,
  period_start, period_end
) VALUES
  -- Hospital San Rafael — Radiología
  ('00000000-0000-0000-0000-000000000200',
   '00000000-0000-0000-0000-000000000300',
   '00000000-0000-0000-0000-000000000030',
   '2026-08-03 14:10:00-05',
   0.78, 'mSv', 0.05, 'valido', 0.78, 0.91, 0.12,
   '2026-07-01', '2026-07-31'),
  ('00000000-0000-0000-0000-000000000201',
   '00000000-0000-0000-0000-000000000300',
   '00000000-0000-0000-0000-000000000030',
   '2026-08-03 14:25:00-05',
   0.61, 'mSv', 0.05, 'valido', 0.61, 0.73, 0.12,
   '2026-07-01', '2026-07-31'),
  -- Hospital San Rafael — Radioterapia (dosis más alta por tipo de trabajo)
  ('00000000-0000-0000-0000-000000000202',
   '00000000-0000-0000-0000-000000000300',
   '00000000-0000-0000-0000-000000000030',
   '2026-08-03 15:00:00-05',
   1.42, 'mSv', 0.08, 'valido', 1.42, 1.65, 0.12,
   '2026-07-01', '2026-07-31'),
  ('00000000-0000-0000-0000-000000000203',
   '00000000-0000-0000-0000-000000000300',
   '00000000-0000-0000-0000-000000000030',
   '2026-08-03 15:18:00-05',
   1.15, 'mSv', 0.07, 'valido', 1.15, 1.33, 0.12,
   '2026-07-01', '2026-07-31'),
  -- Industrias Nucleares — Q2 2026 (trimestrales OSL — dosis acumulada mayor)
  ('00000000-0000-0000-0000-000000000210',
   '00000000-0000-0000-0000-000000000301',
   '00000000-0000-0000-0000-000000000030',
   '2026-07-05 10:00:00-05',
   3.87, 'mSv', 0.15, 'valido', 3.87, 4.20, 0.30,
   '2026-04-01', '2026-06-30'),
  ('00000000-0000-0000-0000-000000000211',
   '00000000-0000-0000-0000-000000000301',
   '00000000-0000-0000-0000-000000000030',
   '2026-07-05 10:45:00-05',
   2.94, 'mSv', 0.12, 'valido', 2.94, 3.15, 0.30,
   '2026-04-01', '2026-06-30');

-- ============================================================
-- REGISTRO DE AUDITORÍA (eventos clave del sistema)
-- ============================================================

INSERT INTO audit_logs (
  user_id, active_role, entity_name, entity_id, action,
  new_values, created_at
) VALUES
  -- Login inicial del administrador
  ('00000000-0000-0000-0000-000000000100',
   'admin_lab', 'session', NULL, 'LOGIN',
   '{"email": "admin@laboratorio.com"}',
   '2026-08-01 08:00:00-05'),
  -- Creación de la orden OS-2026-00001
  ('00000000-0000-0000-0000-000000000100',
   'admin_lab', 'service_orders', '00000000-0000-0000-0000-000000000300', 'CREATE',
   '{"order_number": "OS-2026-00001", "client": "Hospital General San Rafael", "service_type": "lectura_dosis"}',
   '2026-07-31 16:30:00-05'),
  -- Recepción del paquete
  ('00000000-0000-0000-0000-000000000101',
   'tecnico_lab', 'receptions', '00000000-0000-0000-0000-000000000400', 'CREATE',
   '{"reception_code": "REC-2026-00001", "packaging_condition": "integro", "dosimeters_count": 4}',
   '2026-08-01 09:15:00-05'),
  -- Cambio de estado de la orden a RECEIVED
  ('00000000-0000-0000-0000-000000000101',
   'tecnico_lab', 'service_orders', '00000000-0000-0000-0000-000000000300', 'STATUS_CHANGE',
   '{"from": "PENDING", "to": "RECEIVED"}',
   '2026-08-01 09:16:00-05'),
  -- Lectura de dosis registrada
  ('00000000-0000-0000-0000-000000000101',
   'tecnico_lab', 'dosimeter_readings', NULL, 'CREATE',
   '{"dosimeter": "LAB-TLD-001", "measured_dose": 0.78, "unit": "mSv", "equipment": "EQ-TLD-001"}',
   '2026-08-03 14:10:00-05'),
  -- Orden completada
  ('00000000-0000-0000-0000-000000000100',
   'admin_lab', 'service_orders', '00000000-0000-0000-0000-000000000300', 'STATUS_CHANGE',
   '{"from": "IN_PROCESS", "to": "COMPLETED"}',
   '2026-08-03 17:00:00-05');
