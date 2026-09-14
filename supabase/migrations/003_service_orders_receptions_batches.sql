-- ============================================================
-- MIGRACIÓN 003 — Órdenes de servicio, recepción y lotes
--
-- Consolida: 004, 013 (service_orders: created_by/priority),
--            014+022 (índices de ítems)
--
-- NUEVO CAMPO enriquecido:
--   reception_items.condition_photo_url — Foto del estado físico
--   al momento de la recepción (evidencia para trazabilidad ISO 17025)
-- ============================================================

-- ------------------------------------------------------------
-- service_orders
-- Documento formal que inicia el ciclo de laboratorio.
-- NestJS genera el order_number único y gestiona las transiciones.
-- Incluye created_by y priority de migración 013.
-- ------------------------------------------------------------
CREATE TABLE service_orders (
  id             uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id      uuid        NOT NULL REFERENCES clients (id),
  order_number   text        NOT NULL UNIQUE,
  service_type   text        NOT NULL CHECK (service_type IN (
                   'lectura_dosis', 'lectura_y_recarga', 'mantenimiento', 'calibracion'
                 )),
  status         text        NOT NULL DEFAULT 'PENDING' CHECK (status IN (
                   'PENDING', 'RECEIVED', 'IN_PROCESS', 'QC_REVIEW', 'COMPLETED', 'CANCELLED'
                 )),
  requested_date date,
  due_date       date,
  observations   text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  -- campos de entorno real (migración 013)
  created_by     uuid        REFERENCES users (id),
  priority       text        NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgente', 'critica'))
);

COMMENT ON TABLE  service_orders              IS 'Órdenes de servicio. Punto de entrada formal al ciclo de laboratorio.';
COMMENT ON COLUMN service_orders.order_number IS 'Formato: OS-YYYY-NNNNN. Generado por NestJS en CreateServiceOrderUseCase.';
COMMENT ON COLUMN service_orders.status       IS 'Máquina de estados gestionada por NestJS. Cada transición se registra en audit_logs.';
COMMENT ON COLUMN service_orders.created_by   IS 'Usuario que creó la orden. Requerido por ISO 17025.';
COMMENT ON COLUMN service_orders.priority     IS 'Prioridad de procesamiento de la orden.';

-- ------------------------------------------------------------
-- service_order_items
-- Línea de detalle de una orden. Un dosímetro — una línea.
-- ------------------------------------------------------------
CREATE TABLE service_order_items (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_order_id uuid NOT NULL REFERENCES service_orders (id),
  dosimeter_id     uuid NOT NULL REFERENCES dosimeters (id),
  requested_action text NOT NULL CHECK (requested_action IN (
                     'lectura', 'limpieza', 'recarga', 'inspeccion'
                   )),
  status           text NOT NULL DEFAULT 'PENDING' CHECK (status IN (
                     'PENDING', 'RECEIVED', 'IN_PROCESS', 'COMPLETED', 'INCIDENT'
                   )),
  UNIQUE (service_order_id, dosimeter_id)
);

COMMENT ON TABLE service_order_items IS 'Detalle de dosímetros por orden. Un dosímetro no puede aparecer dos veces en la misma orden.';

CREATE INDEX idx_service_order_items_dosimeter ON service_order_items (dosimeter_id);

-- ------------------------------------------------------------
-- receptions
-- Evento físico de llegada del paquete al laboratorio.
-- Se separa de service_orders porque puede haber demora entre
-- la creación de la orden y la llegada física.
-- ------------------------------------------------------------
CREATE TABLE receptions (
  id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_order_id    uuid        NOT NULL REFERENCES service_orders (id),
  received_by         uuid        NOT NULL REFERENCES users (id),
  received_at         timestamptz NOT NULL DEFAULT now(),
  reception_code      text        NOT NULL UNIQUE,
  packaging_condition text        NOT NULL CHECK (packaging_condition IN (
                        'integro', 'danado_leve', 'danado_grave'
                      )),
  observations        text
);

COMMENT ON TABLE  receptions               IS 'Registro físico de llegada de dosímetros. Momento auditable del ingreso al laboratorio.';
COMMENT ON COLUMN receptions.reception_code IS 'Formato: REC-YYYY-NNNNN. Generado por NestJS en CreateReceptionUseCase.';
COMMENT ON COLUMN receptions.received_by   IS 'Usuario que recibe físicamente el paquete. Requerido por ISO 17025.';

-- ------------------------------------------------------------
-- reception_items
-- Estado individual de cada dosímetro al momento de recibirlo.
-- Si contaminated = true o sealed = false, NestJS dispara
-- automáticamente un incident_report antes de continuar.
--
-- NUEVO CAMPO:
--   condition_photo_url — URL a imagen del estado físico al
--   momento de la recepción. Evidencia fotográfica para casos
--   de dosímetros dañados, contaminados o con sello roto.
-- ------------------------------------------------------------
CREATE TABLE reception_items (
  id                   uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
  reception_id         uuid    NOT NULL REFERENCES receptions (id),
  dosimeter_id         uuid    NOT NULL REFERENCES dosimeters (id),
  received_condition   text    NOT NULL DEFAULT 'normal' CHECK (received_condition IN (
                         'normal', 'danado_fisico', 'sello_roto', 'contaminado', 'perdido'
                       )),
  sealed               boolean NOT NULL DEFAULT true,
  contaminated         boolean NOT NULL DEFAULT false,
  observations         text,
  -- NUEVO campo de evidencia fotográfica
  condition_photo_url  text
);

COMMENT ON TABLE  reception_items                    IS 'Estado de cada dosímetro al recibirlo. Anomalías disparan incident_report en NestJS.';
COMMENT ON COLUMN reception_items.contaminated       IS 'Si true, NestJS genera incident_report y bloquea el dosímetro hasta resolución.';
COMMENT ON COLUMN reception_items.condition_photo_url IS 'URL a imagen del estado físico del dosímetro en Supabase Storage. Evidencia de condición al ingreso.';

CREATE INDEX idx_reception_items_dosimeter ON reception_items (dosimeter_id);

-- ------------------------------------------------------------
-- lab_batches
-- Agrupación de dosímetros para procesarlos en conjunto.
-- Los dosímetros que pasan inspección de recepción se agrupan
-- en un lote. A partir de aquí, el proceso se ejecuta sobre
-- el lote, no sobre dosímetros individuales.
-- ------------------------------------------------------------
CREATE TABLE lab_batches (
  id               uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_order_id uuid        REFERENCES service_orders (id),
  reception_id     uuid        REFERENCES receptions (id),
  batch_code       text        NOT NULL UNIQUE,
  batch_type       text        NOT NULL CHECK (batch_type IN (
                     'lectura', 'limpieza', 'recarga', 'mixto'
                   )),
  status           text        NOT NULL DEFAULT 'FORMADO' CHECK (status IN (
                     'FORMADO', 'EN_PROCESO', 'QC_PENDIENTE', 'COMPLETADO', 'INCIDENTE'
                   )),
  created_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  lab_batches           IS 'Lotes de trabajo del laboratorio. Unidad de procesamiento grupal de dosímetros.';
COMMENT ON COLUMN lab_batches.batch_code IS 'Formato: LOT-YYYY-NNNNN. Generado por NestJS en CreateLabBatchUseCase.';

-- ------------------------------------------------------------
-- batch_items
-- Dosímetros que componen cada lote.
-- Un dosímetro solo puede estar en un lote activo a la vez.
-- NestJS valida esto antes de insertar.
-- ------------------------------------------------------------
CREATE TABLE batch_items (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  lab_batch_id uuid NOT NULL REFERENCES lab_batches (id),
  dosimeter_id uuid NOT NULL REFERENCES dosimeters (id),
  status       text NOT NULL DEFAULT 'PENDIENTE' CHECK (status IN (
                 'PENDIENTE', 'EN_PROCESO', 'COMPLETADO', 'INCIDENTE'
               ))
);

COMMENT ON TABLE batch_items IS 'Dosímetros que componen un lote. NestJS valida que no haya dos lotes activos para el mismo dosímetro.';

CREATE INDEX idx_batch_items_dosimeter ON batch_items (dosimeter_id);
