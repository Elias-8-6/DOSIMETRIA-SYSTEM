"""
Servicio demonio en Python para integración de lectoras TLD (WinREMC / WinRETR).
Monitorea la carpeta de salida (spool), aplica el algoritmo UCR / CICAM
y despacha el lote de mediciones al API REST de la Intranet local con control de idempotencia.
"""

import hashlib
import json
import logging
import os
import shutil
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

from ucr_cicam_algorithm import calculate_net_dose_msv, DEFAULT_CAL_FACTOR_SR90
from winremc_parser import parse_winremc_file

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger("TLD_IntegrationDaemon")

# Configuración de rutas
BASE_DIR = Path(__file__).resolve().parent
INBOX_DIR = BASE_DIR / "spool" / "inbox"
ARCHIVE_DIR = BASE_DIR / "spool" / "archive"
ERROR_DIR = BASE_DIR / "spool" / "errors"

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:3000/api/v1")
API_INGEST_ENDPOINT = f"{API_BASE_URL}/readings/ingest"


def ensure_directories():
    """Crea la estructura de carpetas de trabajo si no existen."""
    INBOX_DIR.mkdir(parents=True, exist_ok=True)
    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    ERROR_DIR.mkdir(parents=True, exist_ok=True)


def calculate_sha256(filepath: Path) -> str:
    """Calcula el hash SHA-256 de un archivo para auditoría e idempotencia."""
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha.update(chunk)
    return sha.hexdigest()


def wait_for_file_stability(filepath: Path, wait_seconds: float = 1.0, max_retries: int = 5) -> bool:
    """
    Verifica que el software de la lectora (WinREMC en Windows) haya finalizado
    de escribir el archivo antes de que el script intente leerlo (evita Windows File Lock).
    """
    for _ in range(max_retries):
        try:
            size1 = filepath.stat().st_size
            time.sleep(wait_seconds)
            size2 = filepath.stat().st_size
            if size1 == size2 and size1 > 0:
                # Comprobar si se puede abrir para lectura exclusiva
                with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                    f.read(1)
                return True
        except (PermissionError, IOError):
            time.sleep(wait_seconds)
    return False


def process_reading_file(
    filepath: Path,
    traveler_charge_nc: float = 0.450,
    cal_factor: float = float(DEFAULT_CAL_FACTOR_SR90),
    auth_token: Optional[str] = None,
) -> bool:
    """
    Lee un archivo .txt, extrae las lecturas, ejecuta el cálculo UCR y envía al API REST.
    """
    logger.info(f"Procesando archivo: {filepath.name}")

    if not wait_for_file_stability(filepath):
        logger.error(f"El archivo {filepath.name} no se estabilizó o está bloqueado por otro proceso.")
        return False

    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        file_sha256 = calculate_sha256(filepath)
        raw_records = parse_winremc_file(content)

        if not raw_records:
            logger.warning(f"No se encontraron registros válidos en {filepath.name}")
            return False

        # Transformar registros con el algoritmo UCR / CICAM
        readings_payload = []
        for rec in raw_records:
            # La dosis se evalúa principalmente con la pastilla de cuerpo entero (pos1)
            dose_calc = calculate_net_dose_msv(
                gross_charge_nc=rec["charge_pos1_nc"],
                traveler_charge_nc=traveler_charge_nc,
                cal_factor=cal_factor,
            )

            readings_payload.append({
                "tld_serial_number": rec["serial_number"],
                "read_at": rec["timestamp"] or datetime.utcnow().isoformat(),
                "charge_pos1_nc": rec["charge_pos1_nc"],
                "charge_pos2_nc": rec["charge_pos2_nc"],
                "charge_pos3_nc": rec.get("charge_pos3_nc"),
                "charge_pos4_nc": rec.get("charge_pos4_nc"),
                "measured_dose": dose_calc["measured_dose_msv"],
                "dose_unit": "mSv",
                "hp10": dose_calc["measured_dose_msv"],
                "uncertainty": 0.05,
                "reading_status": "valido",
                "raw_data": {
                    "original_line": rec["line_number"],
                    "is_critical": dose_calc["is_critical_alert"],
                },
            })

        batch_payload = {
            "source_file_name": filepath.name,
            "source_file_sha256": file_sha256,
            "cal_factor_sr90": cal_factor,
            "traveler_charge_nc": traveler_charge_nc,
            "period_start": datetime.utcnow().strftime("%Y-%m-01"),
            "period_end": datetime.utcnow().strftime("%Y-%m-28"),
            "readings": readings_payload,
        }

        # Envío HTTP al backend local (usando requests o urllib nativo)
        import urllib.request
        import urllib.error

        req = urllib.request.Request(
            API_INGEST_ENDPOINT,
            data=json.dumps(batch_payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        if auth_token:
            req.add_header("Authorization", f"Bearer {auth_token}")

        try:
            with urllib.request.urlopen(req, timeout=15) as response:
                resp_data = json.loads(response.read().decode("utf-8"))
                logger.info(
                    f"¡Ingesta exitosa! Lote: {filepath.name} | Procesados: {resp_data.get('total_ingested', len(readings_payload))} | Alertas críticas: {resp_data.get('critical_alerts_count', 0)}"
                )

            # Archivar archivo tras éxito
            archive_target = ARCHIVE_DIR / f"{datetime.now().strftime('%Y-%m')}_{filepath.name}"
            shutil.move(str(filepath), str(archive_target))
            logger.info(f"Archivo archivado en: {archive_target}")
            return True

        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8")
            logger.error(f"Error HTTP {e.code} al enviar lote al backend: {error_body}")
            return False

    except Exception as ex:
        logger.exception(f"Falla inesperada al procesar {filepath.name}: {ex}")
        return False


if __name__ == "__main__":
    ensure_directories()
    logger.info("=== DEMONIO DE INTEGRACIÓN TLD (WinREMC / UCR / CICAM) INICIADO ===")
    logger.info(f"Vigilando directorio de entrada: {INBOX_DIR.resolve()}")

    # Modo prueba inicial: si hay archivos en inbox, procesarlos
    for file in INBOX_DIR.glob("*.txt"):
        process_reading_file(file)
