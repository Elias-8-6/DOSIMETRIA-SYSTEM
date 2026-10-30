"""
Parser especializado para archivos planos generados por WinREMC / WinRETR / Harshaw.
Extrae número de serie de la tarjeta TLD, cargas en nanocoulombs por posición y metadatos.
"""

import re
from typing import Dict, List, Optional


def parse_winremc_file(content: str) -> List[Dict[str, any]]:
    """
    Parsea el contenido de un archivo .txt exportado por WinREMC.

    Formato típico tabular separado por coma o tabulaciones:
    # SERIAL, POS1_NC, POS2_NC, [POS3_NC, POS4_NC], READ_TIMESTAMP
    TLD-CARD-001, 14.250, 13.890, 2026-10-30 08:30:00
    TLD-CARD-002, 58.740, 56.120, 2026-10-30 08:32:15
    """
    records = []
    lines = content.strip().splitlines()

    for line_num, line in enumerate(lines, 1):
        line = line.strip()
        # Omitir líneas vacías y comentarios
        if not line or line.startswith("#") or line.startswith(";"):
            continue

        # Dividir por coma o tabulación o múltiples espacios
        parts = [p.strip() for p in re.split(r"[,;\t]+", line) if p.strip()]

        if len(parts) < 3:
            continue

        serial_number = parts[0]

        try:
            pos1_nc = float(parts[1])
            pos2_nc = float(parts[2])
            pos3_nc = float(parts[3]) if len(parts) > 4 and re.match(r"^-?\d+(\.\d+)?$", parts[3]) else None
            pos4_nc = float(parts[4]) if len(parts) > 5 and re.match(r"^-?\d+(\.\d+)?$", parts[4]) else None

            # Último campo suele ser el timestamp
            timestamp_candidate = parts[-1] if not re.match(r"^-?\d+(\.\d+)?$", parts[-1]) else None

            records.append({
                "serial_number": serial_number,
                "charge_pos1_nc": pos1_nc,
                "charge_pos2_nc": pos2_nc,
                "charge_pos3_nc": pos3_nc,
                "charge_pos4_nc": pos4_nc,
                "timestamp": timestamp_candidate,
                "line_number": line_num,
            })
        except ValueError:
            # Línea de encabezado no parseable numéricamente, continuar
            continue

    return records
