-- ============================================================
-- MIGRACIÓN 023 — Restaurar columnas extendidas de dosimeter_readings
--
-- La migración 021 recreó dosimeter_readings (DROP + CREATE) para
-- particionarla, pero su definición se basó en el CREATE TABLE
-- original de 005 y omitió por error las columnas hp10, hp007 y
-- background_dose agregadas después por 013. Se restauran aquí.
-- ============================================================

ALTER TABLE dosimeter_readings
  ADD COLUMN hp10 numeric,
  ADD COLUMN hp007 numeric,
  ADD COLUMN background_dose numeric;

COMMENT ON COLUMN dosimeter_readings.hp10            IS 'Dosis equivalente cuerpo entero Hp(10) en mSv. Campo estándar ISO.';
COMMENT ON COLUMN dosimeter_readings.hp007           IS 'Dosis equivalente piel Hp(0.07) en mSv. Campo estándar ISO.';
COMMENT ON COLUMN dosimeter_readings.background_dose IS 'Dosis de fondo sustraída de la lectura bruta.';
