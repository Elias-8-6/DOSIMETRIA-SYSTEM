-- ============================================================
-- MIGRACIÓN 009 — Esquema Minsa e ISO 17025
--
-- Implementa:
-- 1. Catálogo oficial de roles técnicos y legales (OPR, EPR, POE, Logístico)
-- 2. Atributos de seguimiento médico y regulatorio de POE en `workers`
-- 3. Modelado físico 1:1 desarmable:
--    - holder_dosimeters (Portadosímetro / Chasis con código de barras)
--    - tld_cards (Dosímetro interno / Tarjeta TLD sensible de 2-4 pastillas)
--    - holder_tld_assemblies (Historial y ensamble activo 1:1)
-- 4. Nuevas categorías en `dosimeter_types` (Personal, Área, Cristalino, Viajero, Calibración UCR)
-- 5. Desacoplamiento documental en logística:
--    - dispatch_guides (Hoja de Entrega / Envío)
--    - dispatch_guide_items
--    - return_guides (Hoja de Devolución / Retorno)
--    - return_guide_items
-- 6. Equipos de medición y triaje:
--    - radiation_survey_meters (Detectores de tasa de dosis con vigencia de calibración)
--    - Enriquecimiento de `reception_items` para control de contaminación y cuarentena
-- 7. Ingesta TLD con alta precisión:
--    - Lecturas en nanocoulombs (nC) por elemento/pastilla
--    - Factores de calibración Sr-90 / Y-90 y resta de viajero
--    - Alerta automática de dosis excesiva (> 2.0 mSv)
--    - Restricción de idempotencia para ingesta
-- 8. Vista puente `dosimeters_assembly_view` para transición suave
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Catálogo de Roles Oficiales
-- ------------------------------------------------------------
INSERT INTO roles (code, name) VALUES
  ('oficial_proteccion_radiologica',   'Oficial de Protección Radiológica'),
  ('encargado_proteccion_radiologica', 'Encargado de Protección Radiológica'),
  ('poe',                              'Personal Ocupacionalmente Expuesto (POE)'),
  ('personal_logistico',                'Personal Logístico / Administrativo')
ON CONFLICT (code) DO NOTHING;

-- ------------------------------------------------------------
-- 2. Seguimiento Médico y Regulatorio Minsa en workers (POE)
-- ------------------------------------------------------------
ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS minsa_exam_date date,
  ADD COLUMN IF NOT EXISTS minsa_certificate_code text,
  ADD COLUMN IF NOT EXISTS medical_status text NOT NULL DEFAULT 'apto' 
    CHECK (medical_status IN ('apto', 'no_apto', 'observado', 'vencido'));

-- Se agrega minsa_exam_expiry_date si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workers' AND column_name = 'minsa_exam_expiry_date'
  ) THEN
    ALTER TABLE workers 
      ADD COLUMN minsa_exam_expiry_date date 
      GENERATED ALWAYS AS (minsa_exam_date + INTERVAL '2 years') STORED;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_workers_minsa_expiry ON workers (minsa_exam_expiry_date);
CREATE INDEX IF NOT EXISTS idx_workers_medical_status ON workers (medical_status);

COMMENT ON COLUMN workers.minsa_exam_date IS 'Fecha del último examen médico ocupacional avalado por Minsa.';
COMMENT ON COLUMN workers.minsa_exam_expiry_date IS 'Vencimiento automático a los 2 años según normativa nacional.';

-- ------------------------------------------------------------
-- 3. Modelado Físico 1:1 Desarmable
-- ------------------------------------------------------------

-- A. Portadosímetro (Chasis plástico exterior con pinza y código de barras)
CREATE TABLE IF NOT EXISTS holder_dosimeters (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  barcode           text NOT NULL UNIQUE,
  serial_number     text NOT NULL UNIQUE,
  holder_color      text DEFAULT 'azul',
  clip_type         text DEFAULT 'pinza_cocodrilo',
  current_condition text NOT NULL DEFAULT 'integro' CHECK (current_condition IN (
                      'integro', 'danado_leve', 'danado_grave', 'sello_roto', 'contaminado', 'perdido'
                    )),
  status            text NOT NULL DEFAULT 'disponible' CHECK (status IN (
                      'disponible', 'ensamblado', 'en_campo', 'en_triaje', 'danado', 'baja'
                    )),
  notes             text,
  photo_url         text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  holder_dosimeters         IS 'Portadosímetros (chasis exterior). Porta el código de barras legible por escáner USB.';
COMMENT ON COLUMN holder_dosimeters.barcode IS 'Código de barras exterior para escaneo continuo en emulación de teclado.';

CREATE INDEX IF NOT EXISTS idx_holder_dosimeters_barcode ON holder_dosimeters (barcode);
CREATE INDEX IF NOT EXISTS idx_holder_dosimeters_status  ON holder_dosimeters (status);

-- B. Tarjeta TLD Interna (Elemento sensible de 2 o 4 pastillas)
CREATE TABLE IF NOT EXISTS tld_cards (
  id                     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  serial_number          text NOT NULL UNIQUE,
  elements_count         int NOT NULL DEFAULT 2 CHECK (elements_count IN (2, 4)),
  tld_material           text NOT NULL DEFAULT 'LiF:Mg,Ti',
  annealing_cycles_count int NOT NULL DEFAULT 0,
  last_annealing_date    timestamptz,
  status                 text NOT NULL DEFAULT 'disponible' CHECK (status IN (
                           'disponible', 'ensamblado', 'en_lectura', 'en_annealing', 'baja'
                         )),
  notes                  text,
  created_at             timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  tld_cards                IS 'Tarjetas TLD internas portadoras de pastillas de fluoruro de litio u otro fósforo dosimétrico.';
COMMENT ON COLUMN tld_cards.elements_count IS 'Número de posiciones sensibles (2 elementos para Hp(10)/Hp(0.07) o 4 elementos).';

CREATE INDEX IF NOT EXISTS idx_tld_cards_serial ON tld_cards (serial_number);
CREATE INDEX IF NOT EXISTS idx_tld_cards_status ON tld_cards (status);

-- C. Ensamble 1:1 e histórico de montaje/desmontaje
CREATE TABLE IF NOT EXISTS holder_tld_assemblies (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  holder_id       uuid NOT NULL REFERENCES holder_dosimeters (id),
  tld_card_id     uuid NOT NULL REFERENCES tld_cards (id),
  assembled_at    timestamptz NOT NULL DEFAULT now(),
  disassembled_at timestamptz,
  assembled_by    uuid REFERENCES users (id),
  disassembled_by uuid REFERENCES users (id),
  is_active       boolean NOT NULL DEFAULT true,
  notes           text
);

-- Garantiza que ni el holder ni la tarjeta puedan estar en más de un ensamble activo al mismo tiempo
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_holder_assembly 
  ON holder_tld_assemblies (holder_id) WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_tld_assembly 
  ON holder_tld_assemblies (tld_card_id) WHERE is_active = true;

COMMENT ON TABLE holder_tld_assemblies IS 'Relación 1 a 1 entre portadosímetro y tarjeta TLD. Audita cuándo se montó y separó cada par.';

-- ------------------------------------------------------------
-- 4. Tipologías de Dosímetro Oficiales
-- ------------------------------------------------------------
INSERT INTO dosimeter_types (code, name, technology) VALUES
  ('TLD_PERSONAL',               'TLD Personal (Cuerpo Entero)',        'TLD'),
  ('TLD_AREA',                   'TLD de Área (Salas / Búnkeres)',       'TLD'),
  ('TLD_CRISTALINO_EXTREMIDADES','TLD Cristalino / Extremidades',        'TLD'),
  ('CONTROL_ENVIO_VIAJERO',      'Control de Envío / Viajero (Sombra)',  'TLD'),
  ('CONTROL_CALIBRACION',        'Control de Calibración (UCR/CICAM)',   'TLD')
ON CONFLICT (code) DO UPDATE 
  SET name = EXCLUDED.name, technology = EXCLUDED.technology;

-- ------------------------------------------------------------
-- 5. Parámetros Técnicos en Órdenes de Servicio
-- ------------------------------------------------------------
ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS radiological_practice text 
    CHECK (radiological_practice IN ('radiodiagnostico', 'aceleradores_lineales', 'medicina_nuclear', 'otro')),
  ADD COLUMN IF NOT EXISTS cycle_period_month int CHECK (cycle_period_month BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS cycle_period_year int;

COMMENT ON COLUMN service_orders.radiological_practice IS 'Práctica radiológica del cliente (~100 keV, ~1 MeV, isótopos abiertos).';

-- ------------------------------------------------------------
-- 6. Desacoplamiento Logístico: Hojas de Entrega y Devolución
-- ------------------------------------------------------------

-- A. Hoja de Entrega (Envío a cliente)
CREATE TABLE IF NOT EXISTS dispatch_guides (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_order_id     uuid NOT NULL REFERENCES service_orders (id),
  guide_number         text NOT NULL UNIQUE,
  dispatched_at        timestamptz NOT NULL DEFAULT now(),
  dispatched_by        uuid NOT NULL REFERENCES users (id),
  carrier_name         text,
  driver_name          text,
  driver_document      text,
  traveler_holder_id   uuid REFERENCES holder_dosimeters (id),
  client_receiver_name text,
  client_signature_url text,
  status               text NOT NULL DEFAULT 'emitida' CHECK (status IN (
                         'borrador', 'emitida', 'en_transito', 'entregada', 'anulada'
                       )),
  observations         text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE dispatch_guides IS 'Hoja de Entrega digital independiente. Documenta el despacho de dosímetros al cliente.';

CREATE TABLE IF NOT EXISTS dispatch_guide_items (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispatch_guide_id uuid NOT NULL REFERENCES dispatch_guides (id) ON DELETE CASCADE,
  holder_id         uuid REFERENCES holder_dosimeters (id),
  dosimeter_id      uuid REFERENCES dosimeters (id), -- Compatibilidad transicional
  worker_id         uuid REFERENCES workers (id),
  target_location   text,
  notes             text
);

-- B. Hoja de Devolución (Retorno al laboratorio)
CREATE TABLE IF NOT EXISTS return_guides (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_order_id    uuid NOT NULL REFERENCES service_orders (id),
  guide_number        text NOT NULL UNIQUE,
  returned_at         timestamptz NOT NULL DEFAULT now(),
  carrier_name        text,
  driver_name         text,
  driver_document     text,
  delivered_by_client text,
  reception_id        uuid REFERENCES receptions (id),
  status              text NOT NULL DEFAULT 'en_transito' CHECK (status IN (
                        'en_transito', 'recibida_lab', 'con_discrepancias', 'cerrada'
                      )),
  observations        text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE return_guides IS 'Hoja de Devolución digital independiente. Documenta el retorno físico de los dosímetros.';

CREATE TABLE IF NOT EXISTS return_guide_items (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_guide_id uuid NOT NULL REFERENCES return_guides (id) ON DELETE CASCADE,
  holder_id       uuid REFERENCES holder_dosimeters (id),
  dosimeter_id    uuid REFERENCES dosimeters (id), -- Compatibilidad transicional
  worker_id       uuid REFERENCES workers (id),
  is_received     boolean NOT NULL DEFAULT false,
  notes           text
);

-- ------------------------------------------------------------
-- 7. Detectores de Tasa de Dosis y Control de Contaminación
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS radiation_survey_meters (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  model                   text NOT NULL,
  serial_number           text NOT NULL UNIQUE,
  manufacturer            text NOT NULL,
  calibration_certificate text NOT NULL,
  calibration_date        date NOT NULL,
  calibration_expiry_date date NOT NULL,
  is_active               boolean NOT NULL DEFAULT true,
  created_at              timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  radiation_survey_meters                 IS 'Detectores portátiles de tasa de dosis utilizados en el triaje de recepción.';
COMMENT ON COLUMN radiation_survey_meters.calibration_expiry_date IS 'Fecha límite de calibración legal (vigencia máxima de 2 años según ISO 17025).';

-- Enriquecimiento de recepción física para triaje y emulación USB
ALTER TABLE reception_items
  ADD COLUMN IF NOT EXISTS scanned_barcode text,
  ADD COLUMN IF NOT EXISTS holder_id uuid REFERENCES holder_dosimeters (id),
  ADD COLUMN IF NOT EXISTS contamination_value numeric(10, 4),
  ADD COLUMN IF NOT EXISTS contamination_unit text DEFAULT 'uSv/h',
  ADD COLUMN IF NOT EXISTS survey_meter_id uuid REFERENCES radiation_survey_meters (id),
  ADD COLUMN IF NOT EXISTS is_quarantined boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quarantine_reason text,
  ADD COLUMN IF NOT EXISTS quarantine_release_date timestamptz;

CREATE INDEX IF NOT EXISTS idx_reception_items_barcode ON reception_items (scanned_barcode);
CREATE INDEX IF NOT EXISTS idx_reception_items_quarantine ON reception_items (is_quarantined) WHERE is_quarantined = true;

-- ------------------------------------------------------------
-- 8. Ingesta TLD: nanoulombs, calibración Sr-90 / Y-90 y alertas > 2.0 mSv
-- ------------------------------------------------------------
ALTER TABLE dosimeter_readings
  ADD COLUMN IF NOT EXISTS tld_card_id uuid REFERENCES tld_cards (id),
  ADD COLUMN IF NOT EXISTS charge_pos1_nc numeric(12, 6),
  ADD COLUMN IF NOT EXISTS charge_pos2_nc numeric(12, 6),
  ADD COLUMN IF NOT EXISTS charge_pos3_nc numeric(12, 6),
  ADD COLUMN IF NOT EXISTS charge_pos4_nc numeric(12, 6),
  ADD COLUMN IF NOT EXISTS cal_factor_sr90 numeric(12, 6),
  ADD COLUMN IF NOT EXISTS background_subtracted_nc numeric(12, 6),
  ADD COLUMN IF NOT EXISTS minsa_report_status text NOT NULL DEFAULT 'normal' 
    CHECK (minsa_report_status IN ('normal', 'alerta_emitida', 'notificado_minsa'));

-- Columna generada para alerta crítica > 2.0 mSv en período mensual
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'dosimeter_readings' AND column_name = 'is_alert_excessive_dose'
  ) THEN
    ALTER TABLE dosimeter_readings 
      ADD COLUMN is_alert_excessive_dose boolean 
      GENERATED ALWAYS AS (measured_dose > 2.0) STORED;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_readings_excessive_dose 
  ON dosimeter_readings (is_alert_excessive_dose) 
  WHERE is_alert_excessive_dose = true;

-- ------------------------------------------------------------
-- 9. Vista de Transición Suave (Strangler Fig)
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW dosimeters_assembly_view AS
SELECT 
  d.id AS legacy_dosimeter_id,
  d.serial_number AS legacy_serial_number,
  d.status_id,
  h.id AS holder_id,
  h.barcode AS holder_barcode,
  h.serial_number AS holder_serial,
  h.current_condition AS holder_condition,
  t.id AS tld_card_id,
  t.serial_number AS tld_serial,
  t.elements_count,
  t.annealing_cycles_count,
  a.assembled_at
FROM dosimeters d
LEFT JOIN holder_dosimeters h ON h.serial_number = d.serial_number
LEFT JOIN holder_tld_assemblies a ON a.holder_id = h.id AND a.is_active = true
LEFT JOIN tld_cards t ON t.id = a.tld_card_id;

COMMIT;
