-- ============================================================
-- MIGRACIÓN 026 — CHECK constraints de rango en campos de dosis
--
-- HALLAZGO: measured_dose, uncertainty, hp10, hp007 y
-- background_dose son numeric sin ningún CHECK de rango. Un
-- error de captura (ej. un signo negativo de más, o un valor
-- fuera de cualquier rango físicamente posible) queda persistido
-- sin objeción — y con el trigger de inmutabilidad de 019, ese
-- error viviría para siempre sin poder corregirse in-place (solo
-- se puede invalidar e insertar una lectura nueva, lo cual es
-- correcto, pero mejor evitar que el dato inválido entre).
-- ============================================================

ALTER TABLE dosimeter_readings
  ADD CONSTRAINT dosimeter_readings_measured_dose_check CHECK (measured_dose >= 0),
  ADD CONSTRAINT dosimeter_readings_uncertainty_check CHECK (uncertainty IS NULL OR uncertainty >= 0),
  ADD CONSTRAINT dosimeter_readings_hp10_check CHECK (hp10 IS NULL OR hp10 >= 0),
  ADD CONSTRAINT dosimeter_readings_hp007_check CHECK (hp007 IS NULL OR hp007 >= 0),
  ADD CONSTRAINT dosimeter_readings_background_dose_check CHECK (background_dose IS NULL OR background_dose >= 0);
