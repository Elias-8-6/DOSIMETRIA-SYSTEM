import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getSurveyMeters,
  processTriageScan,
  getQuarantineItems,
  releaseQuarantineItem,
} from '../../api/receptions.api';
import type { SurveyMeter } from '../../api/receptions.api';

export function TriageScanView() {
  const { id: receptionId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [surveyMeters, setSurveyMeters] = useState<SurveyMeter[]>([]);
  const [selectedMeterId, setSelectedMeterId] = useState<string>('');
  const [selectedMeter, setSelectedMeter] = useState<SurveyMeter | null>(null);

  // Estados de escaneo
  const [barcode, setBarcode] = useState('');
  const [doseRate, setDoseRate] = useState<number>(0.12);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cuarentena
  const [quarantineItems, setQuarantineItems] = useState<any[]>([]);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMeters();
    loadQuarantine();
  }, []);

  const loadMeters = async () => {
    try {
      const data = await getSurveyMeters();
      setSurveyMeters(data);
      if (data.length > 0) {
        setSelectedMeterId(data[0].id);
        setSelectedMeter(data[0]);
      }
    } catch (err: any) {
      setError('Error al cargar equipos de medición radiológica.');
    }
  };

  const loadQuarantine = async () => {
    try {
      const data = await getQuarantineItems();
      setQuarantineItems(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMeterChange = (meterId: string) => {
    setSelectedMeterId(meterId);
    const m = surveyMeters.find((item) => item.id === meterId) || null;
    setSelectedMeter(m);
  };

  const isMeterCalibrationExpired = (meter: SurveyMeter | null) => {
    if (!meter) return true;
    const calDate = new Date(meter.last_calibration_date);
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    return calDate < twoYearsAgo;
  };

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim() || !receptionId || !selectedMeterId) return;

    if (isMeterCalibrationExpired(selectedMeter)) {
      setError('Bloqueo ISO 17025: El detector seleccionado tiene calibración vencida (>2 años).');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await processTriageScan(receptionId, {
        barcode: barcode.trim(),
        survey_meter_id: selectedMeterId,
        measured_dose_rate_uSv_h: Number(doseRate),
      });

      setScanResult(res);
      setBarcode('');
      setTimeout(() => barcodeInputRef.current?.focus(), 100);

      if (res.action === 'ENVIADO_A_CUARENTENA') {
        loadQuarantine();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al procesar escaneo de triaje.');
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseQuarantine = async (itemId: string) => {
    try {
      setLoading(true);
      await releaseQuarantineItem(itemId, 'Liberado tras verificación de decaimiento radiactivo.');
      loadQuarantine();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al liberar dosímetro.');
    } finally {
      setLoading(false);
    }
  };

  const calibrationExpired = isMeterCalibrationExpired(selectedMeter);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Barra Superior */}
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <div>
          <button
            onClick={() => navigate('/receptions')}
            className="text-xs text-blue-600 hover:underline mb-1 cursor-pointer"
          >
            ← Volver a Triaje
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Triaje de Contaminación Superficial (ISO 17025)</h1>
          <p className="text-xs text-gray-500">
            Escaneo continuo con pistola de código de barras USB y verificación de tasa de dosis antes de ingreso al laboratorio.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">
          {error}
        </div>
      )}

      {/* Selector de Detector y Calibración */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-bold uppercase text-gray-700">1. Detector Radiológico de Triaje</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Equipo / Detector</label>
            <select
              value={selectedMeterId}
              onChange={(e) => handleMeterChange(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              {surveyMeters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.model}) — S/N: {m.serial_number}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Estado de Calibración Metrológica</label>
            <div className={`p-2.5 rounded text-xs font-semibold flex items-center justify-between border ${
              calibrationExpired
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-green-50 text-green-700 border-green-200'
            }`}>
              <span>
                Última calibración: {selectedMeter ? new Date(selectedMeter.last_calibration_date).toLocaleDateString() : 'N/A'}
              </span>
              <span>
                {calibrationExpired ? '⛔ VENCIDA (>2 AÑOS) — BLOQUEADO' : '✅ VIGENTE (ISO 17025)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Panel de Escaneo Continuo (Manos Libres) */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-5">
        <h2 className="text-sm font-bold uppercase text-gray-700">2. Escaneo Continuo (Pistola USB)</h2>

        <form onSubmit={handleScanSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Código de Barras del Portadosímetro (Holder Barcode)
              </label>
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Escanee o ingrese código (e.g. UTP-H-0001)..."
                disabled={calibrationExpired || loading}
                autoFocus
                className="w-full border-2 border-blue-400 rounded-lg px-4 py-3 text-lg font-mono focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tasa de Dosis Superficial (µSv/h)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={doseRate}
                onChange={(e) => setDoseRate(Number(e.target.value))}
                disabled={calibrationExpired || loading}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-lg font-semibold focus:border-blue-500"
              />
              <span className="block text-[11px] text-gray-400 mt-1">
                Umbral de fondo: ≤ 0.25 µSv/h
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={calibrationExpired || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg text-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Procesando Triaje...' : 'Registrar Triaje Radiológico (Enter)'}
          </button>
        </form>

        {/* Tarjeta de Resultado del Último Escaneo */}
        {scanResult && (
          <div className={`p-4 rounded-lg border-2 ${
            scanResult.contaminated
              ? 'bg-red-50 border-red-500 text-red-900 animate-pulse'
              : 'bg-green-50 border-green-500 text-green-900'
          }`}>
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider">
                  {scanResult.contaminated ? '🚨 ALERTA RADIOLÓGICA — CONTAMINADO' : '✅ CONFORME — LIBRE DE CONTAMINACIÓN'}
                </span>
                <p className="text-lg font-extrabold mt-1">
                  Dosímetro: {scanResult.dosimeter?.serial_number || 'N/A'} (Holder: {scanResult.dosimeter?.barcode})
                </p>
                <p className="text-sm mt-0.5">
                  Tasa medida: <strong>{scanResult.measured_dose_rate_uSv_h} µSv/h</strong> (Fondo: {scanResult.background_threshold_uSv_h} µSv/h)
                </p>
                {scanResult.quarantine_record && (
                  <p className="text-xs mt-1 text-red-700">
                    Aislado en celda: <strong>{scanResult.quarantine_record.storage_location}</strong> | Fecha estimada de liberación: <strong>{new Date(scanResult.quarantine_record.estimated_decay_date).toLocaleDateString()}</strong>
                  </p>
                )}
              </div>
              <div className="text-3xl">
                {scanResult.contaminated ? '☣️' : '🛡️'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tablero de Cuarentena Radiológica */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-gray-200 pb-3">
          <div>
            <h3 className="text-sm font-bold uppercase text-gray-800">
              ☣️ Dosímetros en Cuarentena Radiológica ({quarantineItems.length})
            </h3>
            <p className="text-xs text-gray-500">
              Aislados bajo protocolo de decaimiento radiactivo de 8 días antes de limpieza o reprocesamiento.
            </p>
          </div>
          <button
            onClick={loadQuarantine}
            className="text-xs text-blue-600 hover:underline cursor-pointer"
          >
            Actualizar Cuarentena
          </button>
        </div>

        {quarantineItems.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">
            No hay dosímetros en cuarentena actualmente.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50 text-gray-600 uppercase font-semibold">
                <tr>
                  <th className="px-3 py-2 text-left">Dosímetro</th>
                  <th className="px-3 py-2 text-left">Ingreso</th>
                  <th className="px-3 py-2 text-left">Tasa Inicial</th>
                  <th className="px-3 py-2 text-left">Decaimiento Estimado</th>
                  <th className="px-3 py-2 text-left">Ubicación</th>
                  <th className="px-3 py-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quarantineItems.map((q) => (
                  <tr key={q.id} className="hover:bg-red-50/20">
                    <td className="px-3 py-2 font-mono font-bold text-gray-900">
                      {q.dosimeters?.serial_number || q.dosimeter_id}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {new Date(q.quarantined_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-red-600 font-bold">
                      {q.initial_dose_rate_uSv_h} µSv/h
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {new Date(q.estimated_decay_date).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-600">
                      {q.storage_location}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => handleReleaseQuarantine(q.id)}
                        className="px-2.5 py-1 bg-green-600 text-white rounded text-[11px] font-semibold hover:bg-green-700 cursor-pointer"
                      >
                        Liberar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
export default TriageScanView;
