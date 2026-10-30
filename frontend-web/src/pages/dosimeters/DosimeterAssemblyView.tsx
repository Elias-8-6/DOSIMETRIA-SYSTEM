import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getHolders,
  getTldCards,
  assembleDosimeter,
} from '../../api/dosimeters.api';
import type { HolderDosimeter, TldCard } from '../../api/dosimeters.api';
import { getWorkers } from '../../api/workers.api';
import type { Worker } from '../../api/workers.api';

export function DosimeterAssemblyView() {
  const navigate = useNavigate();

  const [holders, setHolders] = useState<HolderDosimeter[]>([]);
  const [cards, setCards] = useState<TldCard[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);

  const [selectedHolderId, setSelectedHolderId] = useState('');
  const [selectedCardId, setSelectedCardId] = useState('');
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [assemblyNotes, setAssemblyNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [hList, cList, wList] = await Promise.all([
        getHolders({ status: 'disponible' }),
        getTldCards({ status: 'disponible' }),
        getWorkers({ limit: 100 }),
      ]);
      setHolders(hList);
      setCards(cList);
      setWorkers(wList.items);

      if (hList.length > 0) setSelectedHolderId(hList[0].id);
      if (cList.length > 0) setSelectedCardId(cList[0].id);
      if (wList.items.length > 0) setSelectedWorkerId(wList.items[0].id);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al cargar catálogos de ensamblaje.');
    } finally {
      setLoading(false);
    }
  };

  const selectedWorker = workers.find((w) => w.id === selectedWorkerId);

  const isWorkerMedicalExpired = (w?: Worker) => {
    if (!w || !w.minsa_exam_expiry_date) return true;
    return new Date(w.minsa_exam_expiry_date) < new Date();
  };

  const handleAssemble = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHolderId || !selectedCardId) return;

    if (selectedWorker && (isWorkerMedicalExpired(selectedWorker) || selectedWorker.medical_status !== 'apto')) {
      setError('Bloqueo Minsa: No se puede asignar un dosímetro a un trabajador con examen médico vencido o no apto.');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    try {
      setLoading(true);
      const res = await assembleDosimeter({
        holder_id: selectedHolderId,
        tld_card_id: selectedCardId,
        notes: assemblyNotes,
      });

      setSuccessMsg(`Dosímetro ensamblado exitosamente: S/N ${res.assembly?.dosimeter?.serial_number || 'OK'}`);
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al ensamblar dosímetro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Encabezado */}
      <div>
        <button
          onClick={() => navigate('/dosimeters')}
          className="text-xs text-blue-600 hover:underline mb-1 cursor-pointer"
        >
          ← Volver a Dosímetros
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          Ensamblaje Físico 1:1 (Portadosímetro vs. Tarjeta TLD)
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Modelo modular: Portadosímetro plástico con código de barras USB acoplado a Tarjeta TLD de cristales termosensibles.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm rounded">
          {successMsg}
        </div>
      )}

      {/* Formulario de Ensamblaje */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <form onSubmit={handleAssemble} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Portadosímetro */}
            <div className="p-4 border border-blue-200 bg-blue-50/40 rounded-lg space-y-3">
              <h3 className="text-sm font-bold text-blue-900 uppercase">
                1. Portadosímetro (Holder con Código de Barras)
              </h3>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Seleccionar Holder Disponible ({holders.length})
                </label>
                <select
                  value={selectedHolderId}
                  onChange={(e) => setSelectedHolderId(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
                  required
                >
                  {holders.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.barcode} — Color: {h.color || 'Azul'} ({h.clip_type || 'Clip Cocodrilo'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tarjeta TLD */}
            <div className="p-4 border border-indigo-200 bg-indigo-50/40 rounded-lg space-y-3">
              <h3 className="text-sm font-bold text-indigo-900 uppercase">
                2. Tarjeta TLD Sensible (Pastillas LiF)
              </h3>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Seleccionar Tarjeta TLD Disponible ({cards.length})
                </label>
                <select
                  value={selectedCardId}
                  onChange={(e) => setSelectedCardId(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
                  required
                >
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      S/N: {c.serial_number} — Tipo: {c.card_type} ({c.pellet_count} pastillas, Sens: {c.sensitivity_factor})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* POE Asignado y Aptitud Médica Minsa */}
          <div className="p-4 border border-gray-200 bg-gray-50 rounded-lg space-y-3">
            <h3 className="text-sm font-bold text-gray-800 uppercase">
              3. Validación de Aptitud Médica del POE (Normativa Minsa)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Trabajador Ocupacionalmente Expuesto</label>
                <select
                  value={selectedWorkerId}
                  onChange={(e) => setSelectedWorkerId(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
                >
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.full_name} — DNI: {w.document_number || 'S/D'} ({w.occupation || 'POE'})
                    </option>
                  ))}
                </select>
              </div>

              {selectedWorker && (
                <div className="text-xs space-y-1">
                  <span className="font-semibold text-gray-700">Estado del Examen Médico Bianual:</span>
                  <div className={`p-2 rounded font-bold flex items-center justify-between border ${
                    isWorkerMedicalExpired(selectedWorker) || selectedWorker.medical_status !== 'apto'
                      ? 'bg-red-100 text-red-800 border-red-300'
                      : 'bg-green-100 text-green-800 border-green-300'
                  }`}>
                    <span>Condición: {(selectedWorker.medical_status || 'desconocido').toUpperCase()}</span>
                    <span>
                      Vencimiento: {selectedWorker.minsa_exam_expiry_date ? new Date(selectedWorker.minsa_exam_expiry_date).toLocaleDateString() : 'NO REGISTRADO'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Observaciones de Ensamblaje</label>
            <input
              type="text"
              value={assemblyNotes}
              onChange={(e) => setAssemblyNotes(e.target.value)}
              placeholder="Ej: Ensamblado para ciclo bimestral 2026-10..."
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading || holders.length === 0 || cards.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg text-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Ensamblando...' : 'Ensamblar Dosímetro Modular (1:1)'}
          </button>
        </form>
      </div>
    </div>
  );
}
export default DosimeterAssemblyView;
