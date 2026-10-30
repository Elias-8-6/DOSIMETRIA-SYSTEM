"""
Algoritmo de Calibración UCR / CICAM (Costa Rica).
Conversión de nanocoulombs (nC) a milisieverts (mSv) utilizando factores de calibración
de fuentes de Estroncio-90 / Itrio-90 (Sr-90 / Y-90) y resta de fondo de dosímetro viajero.

Norma: ISO 17025 — Precisión decimal estricta (sin redondeo float IEEE 754).
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Optional, Union

# Factor típico de calibración Sr-90 / Y-90 (mSv/nC) si no se especifica
DEFAULT_CAL_FACTOR_SR90 = Decimal("0.042500")

# Umbral crítico de intervención Minsa
CRITICAL_DOSE_THRESHOLD_MSV = Decimal("2.000000")


def to_decimal(val: Union[int, float, str, Decimal, None]) -> Decimal:
    """Convierte de forma segura cualquier valor numérico a Decimal."""
    if val is None:
        return Decimal("0.0")
    if isinstance(val, Decimal):
        return val
    return Decimal(str(val))


def calculate_net_dose_msv(
    gross_charge_nc: Union[float, str, Decimal],
    traveler_charge_nc: Union[float, str, Decimal, None] = 0.0,
    cal_factor: Union[float, str, Decimal, None] = DEFAULT_CAL_FACTOR_SR90,
    ecc: Union[float, str, Decimal, None] = 1.0,
) -> Dict[str, Union[Decimal, bool, float]]:
    """
    Calcula la dosis neta absorbida en milisieverts (mSv).

    Fórmula:
        Dosis (mSv) = [ (Carga_Bruta - Carga_Viajero) * Factor_Sr90 ] / ECC

    Parámetros:
        gross_charge_nc: Carga total leída por la fotomultiplicadora en nC.
        traveler_charge_nc: Carga del dosímetro control viajero (fondo ambiental).
        cal_factor: Factor de calibración de fuente beta Sr-90 / Y-90 (mSv/nC).
        ecc: Coeficiente de corrección individual del elemento (por defecto 1.0).

    Retorna:
        Diccionario con dosis calculada, carga neta e indicador de alerta crítica.
    """
    gross = to_decimal(gross_charge_nc)
    traveler = to_decimal(traveler_charge_nc)
    factor = to_decimal(cal_factor) if cal_factor is not None else DEFAULT_CAL_FACTOR_SR90
    elem_corr = to_decimal(ecc) if ecc is not None and to_decimal(ecc) > 0 else Decimal("1.0")

    # Resta del dosímetro viajero (no puede ser negativa físicamente)
    net_charge_nc = max(Decimal("0.0"), gross - traveler)

    # Conversión a mSv
    net_dose_msv = (net_charge_nc * factor) / elem_corr

    # Redondeo exacto a 6 decimales para almacenamiento y auditoría
    net_dose_rounded = net_dose_msv.quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP)
    is_critical_alert = net_dose_rounded > CRITICAL_DOSE_THRESHOLD_MSV

    return {
        "gross_charge_nc": float(gross),
        "traveler_charge_nc": float(traveler),
        "net_charge_nc": float(net_charge_nc),
        "cal_factor": float(factor),
        "measured_dose_msv": float(net_dose_rounded),
        "is_critical_alert": bool(is_critical_alert),
    }
