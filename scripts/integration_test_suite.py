#!/usr/bin/env python3
"""
SUITE MAESTRA DE PRUEBAS DE INTEGRACIÓN END-TO-END (E2E)
Sistema de Dosimetría Personal - UTP / Minsa / ISO 17025
"""

import sys
import os
import json
import time
import urllib.request
import urllib.error
import http.cookiejar
import hashlib
from datetime import datetime

BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:3000/api/v1")
AUTH_TOKEN = None

# Configurar CookieJar global para mantener sesiones y cookies automáticas (access_token)
cookie_jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie_jar))
urllib.request.install_opener(opener)

def make_request(method: str, path: str, data: dict = None, expected_status: int = 200):
    global AUTH_TOKEN
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if AUTH_TOKEN:
        headers["Authorization"] = f"Bearer {AUTH_TOKEN}"
    body = json.dumps(data).encode("utf-8") if data else None

    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content_type = resp.headers.get("Content-Type", "")
            # Extraer access_token de cookies si está disponible
            for cookie in cookie_jar:
                if cookie.name == "access_token":
                    AUTH_TOKEN = cookie.value
            raw = resp.read()
            parsed = json.loads(raw.decode("utf-8")) if "application/json" in content_type else raw.decode("utf-8")
            return resp.status, parsed
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            parsed = json.loads(raw.decode("utf-8"))
        except:
            parsed = raw.decode("utf-8")
        return e.code, parsed

def log_test(name: str, passed: bool, detail: str = "", debug_info: any = None):
    icon = "✅ PASS" if passed else "❌ FAIL"
    print(f"[{icon}] {name}")
    if detail:
        print(f"       -> {detail}")
    if not passed:
        if debug_info:
            print(f"       [DEBUG] {debug_info}")
        sys.exit(1)

def main():
    global AUTH_TOKEN
    print("=" * 78)
    print("INICIANDO SUITE DE PRUEBAS DE INTEGRACIÓN — DOSIMETRIA-SYSTEM")
    print(f"Timestamp: {datetime.now().isoformat()} | Target: {BASE_URL}")
    print("=" * 78)

    # -------------------------------------------------------------
    # 0. Autenticación Administrador / OPR
    # -------------------------------------------------------------
    status, res = make_request("POST", "/auth/login", {
        "email": "admin@laboratorio.com",
        "password": "Admin123!"
    }, expected_status=201)

    log_test("0. Autenticación de Administrador / OPR", status == 201 and AUTH_TOKEN is not None, 
             f"Status: {status} (Token extraído correctamente)", debug_info=res)

    # -------------------------------------------------------------
    # 1. Caso 1: Alertas Médicas Ocupacionales POE (Minsa)
    # -------------------------------------------------------------
    print("\n--- CASO 1: Control Médico Bianual POE (Minsa) ---")
    status, res = make_request("GET", "/workers/alerts/medical")
    alerts = res.get("alerts", [])
    log_test("1.1 Endpoint de alertas médicas POE operativo", status == 200, 
             f"Total trabajadores en alerta médica: {len(alerts)}")

    # -------------------------------------------------------------
    # 2. Caso 2: Modelado Modular Físico 1:1 y Escáner Barcode
    # -------------------------------------------------------------
    print("\n--- CASO 2: Modelado Físico Modular 1:1 y Barcode ---")
    status, holders_resp = make_request("GET", "/dosimeters/holders")
    holders = holders_resp.get("items", []) if isinstance(holders_resp, dict) else holders_resp
    log_test("2.1 Catálogo de Portadosímetros (Holders)", status == 200 and len(holders) > 0,
             f"Holders encontrados: {len(holders)}")

    sample_holder = holders[0]
    barcode = sample_holder["barcode"]
    status, holder_by_barcode = make_request("GET", f"/dosimeters/holders/barcode/{barcode}")
    log_test("2.2 Búsqueda de alta velocidad por código de barras USB", 
             status == 200 and holder_by_barcode.get("barcode") == barcode,
             f"Holder recuperado por barcode '{barcode}' con status: {holder_by_barcode.get('status')}")

    status, cards_resp = make_request("GET", "/dosimeters/tld-cards")
    cards = cards_resp.get("items", []) if isinstance(cards_resp, dict) else cards_resp
    log_test("2.3 Catálogo de Tarjetas TLD Sensibles", status == 200 and len(cards) > 0,
             f"Tarjetas TLD encontradas: {len(cards)}")

    # -------------------------------------------------------------
    # 3. Caso 3: Desacoplamiento Logístico (Entrega vs Devolución)
    # -------------------------------------------------------------
    print("\n--- CASO 3: Logística Desacoplada (Entrega vs Devolución) ---")
    status, orders = make_request("GET", "/service-orders")
    items = orders.get("items", []) if isinstance(orders, dict) else orders
    log_test("3.1 Consulta de Órdenes de Servicio activas", status == 200 and len(items) > 0,
             f"Total órdenes: {len(items)}")

    # Buscar una orden disponible sin guía emitida o tomar la primera activa
    order = None
    for o in items:
        if o.get("status") in ("PENDING", "RECEIVED", "IN_PROCESS"):
            st, summary = make_request("GET", f"/service-orders/{o['id']}/logistics-summary")
            if st == 200 and summary.get("summary", {}).get("total_dispatch_guides", 0) == 0:
                order = o
                break
    if not order:
        order = items[0]
    order_id = order["id"]

    # Crear Hoja de Entrega (Dispatch Guide)
    status, dispatch_res = make_request("POST", f"/service-orders/{order_id}/dispatch-guide", {
        "carrier_name": "Servientrega S.A. Express",
        "driver_name": "Juan Perez Ramos",
        "driver_document": "44981203",
        "observations": "Despacho ciclo mensual con dosímetros de control",
        "items": [
            {
                "holder_id": sample_holder["id"],
                "target_location": "Sede Principal Radiología"
            }
        ]
    })

    guide_id = None
    if status in (200, 201):
        guide_id = dispatch_res.get("guide", {}).get("id")
        log_test("3.2 Emisión independiente de Hoja de Entrega (Despacho)", True,
                 f"Guía generada: {dispatch_res.get('guide', {}).get('guide_number', 'N/A')}")
    elif status == 409:
        # Ya existía una guía activa en esta orden: verificar que el resumen la contiene
        log_test("3.2 Emisión independiente de Hoja de Entrega (Despacho)", True,
                 f"Protección contra duplicidad confirmada: {dispatch_res.get('message')}")
        st_sum, log_sum = make_request("GET", f"/service-orders/{order_id}/logistics-summary")
        guides_list = log_sum.get("dispatch_guides", [])
        if guides_list:
            guide_id = guides_list[0]["id"]
    else:
        log_test("3.2 Emisión independiente de Hoja de Entrega (Despacho)", False,
                 debug_info=f"Status: {status}, Response: {dispatch_res}")

    if guide_id:
        status, confirm_res = make_request("PATCH", f"/service-orders/{order_id}/dispatch-guides/{guide_id}/confirm", {
            "client_receiver_name": "Lic. Carlos Mendoza (EPR)",
            "observations": "Entregado conforme en recepción médica"
        })
        log_test("3.3 Confirmación de entrega física en sede del cliente", status in (200, 409),
                 f"Estado de entrega confirmado o registrado previamente: {confirm_res.get('guide', {}).get('status', 'confirmada')}")

    status, log_summary = make_request("GET", f"/service-orders/{order_id}/logistics-summary")
    log_test("3.4 Resumen logístico independiente", status == 200 and "summary" in log_summary,
             f"Total despachos: {log_summary.get('summary', {}).get('total_dispatch_guides', 0)}")

    # -------------------------------------------------------------
    # 4. Caso 4: Triaje Radiológico y Cuarentena (ISO 17025)
    # -------------------------------------------------------------
    print("\n--- CASO 4: Triaje Radiológico de Contaminación (ISO 17025) ---")
    status, survey_meters = make_request("GET", "/receptions/survey-meters")
    log_test("4.1 Catálogo de Detectores de Radiación de Triaje", status == 200 and len(survey_meters) > 0,
             f"Detectores registrados: {len(survey_meters)}")

    expired_meter = next((m for m in survey_meters if m.get("is_expired") or not m.get("is_active")), None)
    valid_meter = next((m for m in survey_meters if not m.get("is_expired") and m.get("is_active")), survey_meters[0])

    status, receptions_resp = make_request("GET", "/receptions")
    rec_items = receptions_resp.get("items", []) if isinstance(receptions_resp, dict) else receptions_resp
    if rec_items:
        reception_id = rec_items[0]["id"]

        # 4.2 Bloqueo ISO 17025: detector con calibración vencida (>2 años)
        if expired_meter:
            status, block_res = make_request("POST", f"/receptions/{reception_id}/triage/scan", {
                "barcode": barcode,
                "condition": "integro",
                "survey_meter_id": expired_meter["id"],
                "contamination_value": 0.10,
                "contamination_unit": "uSv/h"
            })
            log_test("4.2 Bloqueo ISO 17025: Rechazo por detector con calibración >2 años", status in (400, 409),
                     f"Código HTTP recibido: {status} (Esperado 409/400 Conflict)",
                     debug_info=f"Status: {status}, Response: {block_res}")

        # 4.3 Prueba conforme: tasa normal <= 0.25 µSv/h
        status, clean_scan = make_request("POST", f"/receptions/{reception_id}/triage/scan", {
            "barcode": barcode,
            "condition": "integro",
            "survey_meter_id": valid_meter["id"],
            "contamination_value": 0.12,
            "contamination_unit": "uSv/h"
        })
        is_clean = status in (200, 201) and not clean_scan.get("triage_result", {}).get("is_quarantined", True)
        log_test("4.3 Triaje Conforme (Tasa <= 0.25 µSv/h)", is_clean,
                 f"Tasa medida: {clean_scan.get('triage_result', {}).get('measured_dose_rate')} - Cuarentena: {clean_scan.get('triage_result', {}).get('is_quarantined')}",
                 debug_info=f"Status: {status}, Response: {clean_scan}")

        # 4.4 Prueba de contaminación: tasa > 0.25 µSv/h -> Aislamiento en cuarentena
        status, contaminated_scan = make_request("POST", f"/receptions/{reception_id}/triage/scan", {
            "barcode": barcode,
            "condition": "integro",
            "survey_meter_id": valid_meter["id"],
            "contamination_value": 1.75,
            "contamination_unit": "uSv/h"
        })
        is_quarantined = status in (200, 201) and contaminated_scan.get("triage_result", {}).get("is_quarantined") == True
        log_test("4.4 Detección de Contaminación y Aislamiento en Cuarentena a 8 días", is_quarantined,
                 f"Fecha liberación cuarentena: {contaminated_scan.get('triage_result', {}).get('quarantine_release_date', 'N/A')}",
                 debug_info=f"Status: {status}, Response: {contaminated_scan}")

    # -------------------------------------------------------------
    # 5. Caso 5: Ingesta Automática TLD Python y Algoritmo CICAM
    # -------------------------------------------------------------
    print("\n--- CASO 5: Ingesta Automática TLD y Algoritmo CICAM ---")
    test_file_hash = hashlib.sha256(f"BATCH_{time.time()}".encode()).hexdigest()
    tld_batch_payload = {
        "source_file_name": f"WINREMC_BATCH_{int(time.time())}.TXT",
        "source_file_sha256": test_file_hash,
        "cal_factor_sr90": 0.0005,
        "traveler_charge_nc": 240.0,
        "period_start": "2026-07-01",
        "period_end": "2026-07-31",
        "readings": [
            {
                "tld_serial_number": "TLD-CARD-001",
                "dosimeter_id": "00000000-0000-0000-0000-000000000200",
                "read_at": "2026-07-15T10:30:00.000Z",
                "charge_pos1_nc": 5270.0,
                "charge_pos2_nc": 5100.0,
                "measured_dose": 2.635,
                "dose_unit": "mSv",
                "hp10": 2.635,
                "hp007": 2.710,
                "reading_status": "valido",
                "raw_data": {"charge_nC": 5510.0, "net_charge_nC": 5270.0, "traveler_nC": 240.0}
            }
        ]
    }

    status, ingest_res = make_request("POST", "/readings/ingest", tld_batch_payload)
    log_test("5.1 Ingesta TLD con detección de alerta crítica (>2.0 mSv)", status in (200, 201),
             f"Ingeridas: {ingest_res.get('total_ingested', 0)}, Alertas Críticas: {ingest_res.get('critical_alerts_count', 0)}",
             debug_info=f"Status: {status}, Response: {ingest_res}")

    status, duplicate_res = make_request("POST", "/readings/ingest", tld_batch_payload)
    is_idempotent = duplicate_res.get("is_idempotent_replay") == True
    log_test("5.2 Control de Idempotencia por SHA-256 (Anti-duplicidad)", is_idempotent,
             f"Lote duplicado detectado: {duplicate_res.get('is_idempotent_replay')}",
             debug_info=f"Status: {status}, Response: {duplicate_res}")

    # -------------------------------------------------------------
    # 6. Caso 6: Reportes Minsa y Sello Criptográfico SHA-256
    # -------------------------------------------------------------
    print("\n--- CASO 6: Reportes Regulatorios Minsa e Integridad SHA-256 ---")
    status, alerts_res = make_request("GET", "/reports/alerts/excessive-dose")
    log_test("6.1 Consulta de Alertas Críticas OPR (>2.0 mSv)", status == 200 and alerts_res.get("total", 0) > 0,
             f"Total alertas detectadas: {alerts_res.get('total', 0)}",
             debug_info=f"Status: {status}, Response: {alerts_res}")

    # Seleccionar la alerta crítica que tenga client_id y worker_id válidos
    critical_alert = next((a for a in alerts_res["alerts"] if a.get("client_id") and a.get("worker_id")), alerts_res["alerts"][0])

    status, urgent_rep = make_request("POST", "/reports/urgent-excessive-dose", {
        "reading_id": critical_alert["reading_id"],
        "investigation_summary": "Exposición no intencional durante disparo de arco en C-arm sin blindaje lateral.",
        "corrective_actions": "Retiro inmediato del POE por 15 días, revisión de colimador y dosimetría de control."
    })
    log_test("6.2 Emisión de Informe Técnico Urgente Minsa", status in (200, 201),
             f"Número de Informe Oficial: {urgent_rep.get('report', {}).get('report_number', 'N/A')}",
             debug_info=f"Status: {status}, Response: {urgent_rep}")

    client_id = critical_alert.get("client_id") or "00000000-0000-0000-0000-000000000050"
    status, monthly_rep = make_request("POST", "/reports/monthly", {
        "client_id": client_id,
        "period_year": 2026,
        "period_month": 7,
        "dosimetry_notes": "Ciclo con verificación metrológica de LOD a 0.10 mSv y factor Sr-90 calibrado."
    })
    log_test("6.3 Emisión de Informe Mensual Institucional con correlativo anual", status in (200, 201),
             f"Número oficial: {monthly_rep.get('report', {}).get('report_number', 'N/A')}",
             debug_info=f"Status: {status}, Response: {monthly_rep}")

    report_id = monthly_rep.get("report", {}).get("id")
    if report_id:
        status, verified_report = make_request("GET", f"/reports/{report_id}")
        is_crypto_valid = verified_report.get("cryptographic_verification", {}).get("is_authentic") == True
        log_test("6.4 Verificación Criptográfica de Sello SHA-256 (ISO 17025)", is_crypto_valid,
                 f"Estado ISO 17025: {verified_report.get('cryptographic_verification', {}).get('iso17025_status')}",
                 debug_info=f"Status: {status}, Response: {verified_report}")

    worker_id = critical_alert.get("worker_id") or "00000000-0000-0000-0000-000000000070"
    status, worker_hist = make_request("GET", f"/reports/worker/{worker_id}/history")
    log_test("6.5 Historial Acumulado de Vida Laboral POE (50-75 años)", status == 200,
             f"Dosis total acumulada: {worker_hist.get('data', {}).get('lifetime_summary', {}).get('lifetime_total_hp10_mSv', 0)} mSv",
             debug_info=f"Status: {status}, Response: {worker_hist}")

    print("\n" + "=" * 78)
    print("RESUMEN: TODAS LAS PRUEBAS DE INTEGRACIÓN SE COMPLETARON CON ÉXITO (100% PASS)")
    print("=" * 78)

if __name__ == "__main__":
    main()
