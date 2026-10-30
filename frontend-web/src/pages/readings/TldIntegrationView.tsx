import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios.config';
import { getTldCards } from '../../api/dosimeters.api';
import type { TldCard } from '../../api/dosimeters.api';

interface IngestResponse {
  message: string;
  sha256: string;
  file_name?: string;
  total_ingested?: number;
  critical_alerts_count?: number;
  critical_alerts?: Array<{ serial: string; dose: number }>;
  is_idempotent_replay?: boolean;
}

export function TldIntegrationView() {
  const navigate = useNavigate();

  // Estados del formulario de lote
  const [sourceFileName, setSourceFileName] = useState('WINREMC_BATCH_2026_10.TXT');
  const [calFactorSr90, setCalFactorSr90] = useState<number>(0.0005);
  const [travelerChargeNc, setTravelerChargeNc] = useState<number>(240.0);
  const [tldSerialNumber, setTldSerialNumber] = useState('TLD-CARD-001');
  const [chargePos1, setChargePos1] = useState<number>(5270.0);
  const [chargePos2, setChargePos2] = useState<number>(5100.0);
  const [calculatedDose, setCalculatedDose] = useState<number>(2.635);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ingestResult, setIngestResult] = useState<IngestResponse | null>(null);

  // Catálogos auxiliares
  const [cards, setCards] = useState<TldCard[]>([]);

  useEffect(() => {
    async function loadCards() {
      try {
        const cList = await getTldCards();
        const arr = Array.isArray(cList) ? cList : (cList as any)?.items || [];
        setCards(arr);
        if (arr.length > 0) {
          setTldSerialNumber(arr[0].serial_number);
        }
      } catch (e) {
        // Ignorar si no carga
      }
    }
    loadCards();
  }, []);

  // Recalcular dosis estimada con algoritmo CICAM (nC netos * factor)
  useEffect(() => {
    const netCharge = Math.max(0, chargePos1 - travelerChargeNc);
    const dose = parseFloat((netCharge * calFactorSr90).toFixed(3));
    setCalculatedDose(dose);
  }, [chargePos1, travelerChargeNc, calFactorSr90]);

  const handleSimulateIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIngestResult(null);

    // Generar hash determinista o pseudo-aleatorio basado en el archivo
    const rawContent = `${sourceFileName}_${tldSerialNumber}_${chargePos1}_${Date.now()}`;
    // Usar SHA-256 en navegador mediante Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(rawContent);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const fileSha256 = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    const payload = {
      source_file_name: sourceFileName,
      source_file_sha256: fileSha256,
      cal_factor_sr90: calFactorSr90,
      traveler_charge_nc: travelerChargeNc,
      readings: [
        {
          tld_serial_number: tldSerialNumber,
          dosimeter_id: '00000000-0000-0000-0000-000000000200',
          read_at: new Date().toISOString(),
          charge_pos1_nc: chargePos1,
          charge_pos2_nc: chargePos2,
          measured_dose: calculatedDose,
          dose_unit: 'mSv',
          hp10: calculatedDose,
          hp007: parseFloat((calculatedDose * 1.03).toFixed(3)),
          reading_status: 'valido',
          raw_data: {
            charge_nC: chargePos1 + travelerChargeNc,
            net_charge_nC: chargePos1,
            traveler_nC: travelerChargeNc,
          },
        },
      ],
    };

    try {
      setLoading(true);
      const res = await api.post<IngestResponse>('/readings/ingest', payload);
      setIngestResult(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al procesar ingesta de lecturas TLD.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Integración de Lecturas TLD (WinREMC / Algoritmo CICAM)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Recepción automática, cálculo de dosis por calibración Sr-90 / Y-90, resta de fondo viajero e inmutabilidad SHA-256.
          </p>
        </div>
        <button
          onClick={() => navigate('/reports')}
          className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors cursor-pointer"
        >
          Ver Alertas Críticas OPR &gt;
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">
          {error}
        </div>
      )}

      {/* Tarjetas informativas de arquitectura */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
          <span className="font-bold text-blue-900 block text-sm">Algoritmo CICAM</span>
          <p className="text-blue-800">
            Dosis medida: <code className="bg-white px-1 py-0.5 rounded font-mono">D = (Q - Q_viajero) × F_cal</code>
          </p>
          <span className="text-blue-600 block mt-1">Límite detección (LOD): 0.10 mSv</span>
        </div>

        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-1">
          <span className="font-bold text-purple-900 block text-sm">Control de Idempotencia</span>
          <p className="text-purple-800">
            Hash SHA-256 obligatorio por lote. Archivos re-transmitidos son descartados para evitar duplicidad.
          </p>
          <span className="text-purple-600 block mt-1">ISO 17025 Trazabilidad</span>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
          <span className="font-bold text-amber-900 block text-sm">Alerta Dosis Crítica</span>
          <p className="text-amber-800">
            Toda lectura <code className="font-bold">&gt; 2.0 mSv</code> dispara alerta inmediata y apertura de informe OPR.
          </p>
          <span className="text-amber-600 block mt-1">Normativa Minsa</span>
        </div>
      </div>

      {/* Formulario de Ingesta */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-5">
        <h2 className="text-base font-bold text-gray-900 border-b pb-2">
          Ingesta y Procesamiento de Lote Dosimétrico
        </h2>

        <form onSubmit={handleSimulateIngest} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre Archivo WinREMC</label>
              <input
                type="text"
                value={sourceFileName}
                onChange={(e) => setSourceFileName(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Factor Sr-90 / Y-90 (mSv/nC)</label>
              <input
                type="number"
                step="0.0001"
                value={calFactorSr90}
                onChange={(e) => setCalFactorSr90(parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Carga Dosímetro Viajero (nC)</label>
              <input
                type="number"
                step="1"
                value={travelerChargeNc}
                onChange={(e) => setTravelerChargeNc(parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tarjeta TLD (S/N)</label>
              {cards.length > 0 ? (
                <select
                  value={tldSerialNumber}
                  onChange={(e) => setTldSerialNumber(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
                >
                  {cards.map((c) => (
                    <option key={c.id} value={c.serial_number}>
                      {c.serial_number} {c.status ? `(${c.status})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={tldSerialNumber}
                  onChange={(e) => setTldSerialNumber(e.target.value)}
                  placeholder="Ej: TLD-CARD-001"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
                  required
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Carga Pastilla 1 (nC)</label>
              <input
                type="number"
                step="10"
                value={chargePos1}
                onChange={(e) => setChargePos1(parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Carga Pastilla 2 (nC)</label>
              <input
                type="number"
                step="10"
                value={chargePos2}
                onChange={(e) => setChargePos2(parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
                required
              />
            </div>
          </div>

          {/* Cálculo automático de dosis */}
          <div className={`p-4 rounded-lg border text-sm flex justify-between items-center ${
            calculatedDose > 2.0
              ? 'bg-red-50 border-red-300 text-red-900'
              : 'bg-green-50 border-green-300 text-green-900'
          }`}>
            <div>
              <span className="font-bold block text-base">
                Dosis Calculada Hp(10): {calculatedDose.toFixed(3)} mSv
              </span>
              <span className="text-xs">
                {calculatedDose > 2.0
                  ? '⚠️ ALERTA: Esta dosis supera el umbral crítico (>2.0 mSv) y generará notificación inmediata al OPR.'
                  : '✓ Dosis en rango normal (<2.0 mSv).'}
              </span>
            </div>
            <div className="text-right font-mono text-xs">
              <p>Neto: {(chargePos1 - travelerChargeNc).toFixed(1)} nC</p>
              <p>F_cal: {calFactorSr90}</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg text-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Procesando e Ingestando...' : 'Ejecutar Ingesta de Lectura TLD'}
          </button>
        </form>
      </div>

      {/* Resultado de la Ingesta */}
      {ingestResult && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-green-700 font-bold text-base">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            {ingestResult.message}
          </div>

          <div className="text-xs font-mono bg-gray-50 p-4 rounded border border-gray-200 space-y-1">
            <p><strong>Hash SHA-256:</strong> {ingestResult.sha256}</p>
            <p><strong>Total Ingeridas:</strong> {ingestResult.total_ingested ?? 1}</p>
            <p><strong>Alertas Críticas (&gt;2.0 mSv):</strong> {ingestResult.critical_alerts_count ?? (calculatedDose > 2.0 ? 1 : 0)}</p>
            {ingestResult.is_idempotent_replay && (
              <p className="text-amber-700 font-bold">⚠️ Idempotencia: Lote duplicado ignorado sin alterar la base de datos.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export default TldIntegrationView;
