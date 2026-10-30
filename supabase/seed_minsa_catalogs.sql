-- ============================================================
-- SEED DATA — Casos de Prueba y Golden Dataset Minsa / ISO 17025
-- ============================================================

BEGIN;

-- 1. Insertar Detectores de Radiación (uno vigente y uno vencido para test de validación)
INSERT INTO radiation_survey_meters (id, model, serial_number, manufacturer, calibration_certificate, calibration_date, calibration_expiry_date, is_active)
VALUES 
  ('a1111111-1111-1111-1111-111111111111', 'Ludlum Model 9DP', 'RAD-DET-001', 'Ludlum Measurements', 'CERT-CAL-2025-089', CURRENT_DATE - INTERVAL '6 months', CURRENT_DATE + INTERVAL '18 months', true),
  ('b2222222-2222-2222-2222-222222222222', 'Fluke 451P', 'RAD-DET-002-EXPIRED', 'Fluke Biomedical', 'CERT-CAL-2023-012', CURRENT_DATE - INTERVAL '26 months', CURRENT_DATE - INTERVAL '2 months', false)
ON CONFLICT (serial_number) DO NOTHING;

-- 2. Portadosímetros (Chasis con códigos de barras para escáner USB)
INSERT INTO holder_dosimeters (id, barcode, serial_number, holder_color, clip_type, current_condition, status)
VALUES
  ('c3333333-3333-3333-3333-333333333331', 'BAR-HOLD-001', 'HOLD-SN-001', 'azul', 'pinza_cocodrilo', 'integro', 'ensamblado'),
  ('c3333333-3333-3333-3333-333333333332', 'BAR-HOLD-002', 'HOLD-SN-002', 'azul', 'pinza_cocodrilo', 'integro', 'ensamblado'),
  ('c3333333-3333-3333-3333-333333333333', 'BAR-HOLD-003', 'HOLD-SN-003', 'rojo', 'anillo', 'integro', 'ensamblado'),
  ('c3333333-3333-3333-3333-333333333334', 'BAR-HOLD-VIAJERO', 'HOLD-VIAJERO-01', 'verde', 'sin_pinza', 'integro', 'disponible')
ON CONFLICT (barcode) DO NOTHING;

-- 3. Tarjetas TLD Internas (2 y 4 pastillas)
INSERT INTO tld_cards (id, serial_number, elements_count, tld_material, annealing_cycles_count, status)
VALUES
  ('d4444444-4444-4444-4444-444444444441', 'TLD-CARD-001', 2, 'LiF:Mg,Ti', 5, 'ensamblado'),
  ('d4444444-4444-4444-4444-444444444442', 'TLD-CARD-002', 2, 'LiF:Mg,Ti', 12, 'ensamblado'),
  ('d4444444-4444-4444-4444-444444444443', 'TLD-CARD-003', 4, 'LiF:Mg,Cu,P', 3, 'ensamblado'),
  ('d4444444-4444-4444-4444-444444444444', 'TLD-CARD-VIAJERO', 2, 'LiF:Mg,Ti', 1, 'disponible')
ON CONFLICT (serial_number) DO NOTHING;

-- 4. Ensambles Activos 1 a 1
INSERT INTO holder_tld_assemblies (holder_id, tld_card_id, is_active, notes)
VALUES
  ('c3333333-3333-3333-3333-333333333331', 'd4444444-4444-4444-4444-444444444441', true, 'Ensamble de prueba personal'),
  ('c3333333-3333-3333-3333-333333333332', 'd4444444-4444-4444-4444-444444444442', true, 'Ensamble para prueba de dosis crítica'),
  ('c3333333-3333-3333-3333-333333333333', 'd4444444-4444-4444-4444-444444444443', true, 'Ensamble 4 pastillas cristalino')
ON CONFLICT DO NOTHING;

-- 5. Actualización de datos médicos Minsa para trabajadores (POE) de prueba
UPDATE workers
SET 
  minsa_exam_date = CURRENT_DATE - INTERVAL '6 months',
  minsa_certificate_code = 'CERT-MED-2025-9981',
  medical_status = 'apto'
WHERE employee_code IS NOT NULL AND minsa_exam_date IS NULL;

COMMIT;
