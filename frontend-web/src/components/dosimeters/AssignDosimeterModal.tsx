import { useEffect, useState, useRef } from 'react';
import type { FormEvent } from 'react';
import type { Worker } from '../../api/workers.api';
import { getWorkers } from '../../api/workers.api';
import {
  assignDosimeter,
  getHolders,
  validateHolderBarcode,
} from '../../api/dosimeters.api';
import type { HolderDosimeter } from '../../api/dosimeters.api';
import { useDebounce } from '../../hooks/useDebounce';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { FormFooter } from '../ui/FormFooter';
import { extractApiError } from '../../utils/api';
import { today } from '../../utils/date';
import { isDateNotFuture } from '../../utils/validation';

interface Props {
  dosimeterId: string;
  dosimeterSerial?: string;
  activeHolder?: (HolderDosimeter & { assembly_id?: string | null; assembled_at?: string | null }) | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignDosimeterModal({
  dosimeterId,
  dosimeterSerial,
  activeHolder: initialHolder,
  onClose,
  onSuccess,
}: Props) {
  // POE Selection
  const [search, setSearch] = useState('');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workerId, setWorkerId] = useState('');
  const [assignedAt, setAssignedAt] = useState(today());
  const [notes, setNotes] = useState('');

  // Portadosímetro (Holder) State
  const [holder, setHolder] = useState<HolderDosimeter | null>(initialHolder ?? null);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [validatingBarcode, setValidatingBarcode] = useState(false);
  const [barcodeValidationMsg, setBarcodeValidationMsg] = useState<{
    success: boolean;
    text: string;
  } | null>(null);

  // Manual list fallback
  const [showManualList, setShowManualList] = useState(false);
  const [availableHolders, setAvailableHolders] = useState<HolderDosimeter[]>([]);
  const [selectedHolderId, setSelectedHolderId] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(search, 300);

  // Focus barcode input if no holder is initially assembled
  useEffect(() => {
    if (!initialHolder) {
      const timer = setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [initialHolder]);

  // Load workers
  useEffect(() => {
    getWorkers({ search: debouncedSearch || undefined, status: 'active', limit: 20 })
      .then((res) => setWorkers(res.items))
      .catch(() => setWorkers([]));
  }, [debouncedSearch]);

  // Load available holders if user wants to pick from list
  useEffect(() => {
    if (showManualList && availableHolders.length === 0) {
      getHolders({ status: 'disponible', limit: 50 })
        .then((res) => setAvailableHolders(res.items))
        .catch(() => setAvailableHolders([]));
    }
  }, [showManualList, availableHolders.length]);

  // Validate barcode scanned with USB scanner
  const handleValidateBarcode = async (codeToTest: string) => {
    const clean = codeToTest.trim();
    if (!clean) return;

    setValidatingBarcode(true);
    setBarcodeValidationMsg(null);
    try {
      const res = await validateHolderBarcode(clean);
      if (res.exists && res.holder) {
        if (res.holder.status !== 'disponible' && res.holder.status !== 'ensamblado') {
          setBarcodeValidationMsg({
            success: false,
            text: `Portadosímetro '${clean}' no disponible (estado: ${res.holder.status}).`,
          });
          setHolder(null);
        } else if (['danado_grave', 'contaminado', 'perdido'].includes(res.holder.current_condition)) {
          setBarcodeValidationMsg({
            success: false,
            text: `Portadosímetro '${clean}' en condición crítica (${res.holder.current_condition}).`,
          });
          setHolder(null);
        } else {
          setHolder(res.holder);
          setBarcodeValidationMsg({
            success: true,
            text: `Portadosímetro detectado y apto (${res.holder.holder_color || 'Azul'} / ${res.holder.clip_type || 'Clip Cocodrilo'}).`,
          });
        }
      } else {
        setBarcodeValidationMsg({
          success: false,
          text: `Código '${clean}' no está registrado en el catálogo de portadosímetros.`,
        });
        setHolder(null);
      }
    } catch {
      setBarcodeValidationMsg({
        success: false,
        text: 'Error al consultar código de barras.',
      });
      setHolder(null);
    } finally {
      setValidatingBarcode(false);
    }
  };

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleValidateBarcode(scannedBarcode);
    }
  };

  const handleSelectManualHolder = (id: string) => {
    setSelectedHolderId(id);
    const found = availableHolders.find((h) => h.id === id);
    if (found) {
      setHolder(found);
      setScannedBarcode(found.barcode);
      setBarcodeValidationMsg({
        success: true,
        text: `Portadosímetro seleccionado: ${found.barcode} (${found.holder_color || 'Azul'}).`,
      });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!holder && !scannedBarcode) {
      setError('Debe escanear o vincular un portadosímetro válido antes de asignar.');
      return;
    }

    if (!workerId) {
      setError('Seleccioná un personal POE');
      return;
    }
    if (!isDateNotFuture(assignedAt)) {
      setError('La fecha de asignación no puede ser una fecha futura');
      return;
    }
    setLoading(true);
    try {
      await assignDosimeter(dosimeterId, {
        worker_id: workerId,
        assigned_at: assignedAt,
        notes: notes || undefined,
        holder_id: holder?.id,
        holder_barcode: scannedBarcode ? scannedBarcode.trim() : undefined,
      });
      onClose();
      onSuccess();
    } catch (err) {
      setError(extractApiError(err, 'Error al asignar el dosímetro'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        dosimeterSerial
          ? `Asignar Dosímetro (${dosimeterSerial})`
          : 'Asignar dosímetro a Personal POE'
      }
      onClose={onClose}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
        {/* SECCIÓN 1: VALIDACIÓN DEL PORTADOSÍMETRO */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <span>🛡️</span> Portadosímetro (Chasis Exterior)
            </span>
            {holder && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                ✓ Ensamblado y Apto
              </span>
            )}
          </div>

          {holder ? (
            <div className="bg-white border border-green-200 rounded-md p-2.5 text-xs text-slate-700 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 flex items-center gap-1">
                  <span>🏷️</span> Código: {holder.barcode}
                </span>
                <span className="text-slate-500">Serie: {holder.serial_number}</span>
              </div>
              <div className="text-slate-500 flex gap-3 text-[11px]">
                <span>Color: <strong className="capitalize">{holder.holder_color || 'Azul'}</strong></span>
                <span>Clip: <strong className="capitalize">{holder.clip_type || 'Cocodrilo'}</strong></span>
                <span>Condición: <strong className="capitalize">{holder.current_condition || 'Íntegro'}</strong></span>
              </div>
              {!initialHolder && (
                <button
                  type="button"
                  onClick={() => {
                    setHolder(null);
                    setScannedBarcode('');
                    setBarcodeValidationMsg(null);
                  }}
                  className="text-xs text-red-600 hover:underline pt-1 inline-block"
                >
                  Cambiar portadosímetro
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
                <strong>Requisito ISO 17025:</strong> Este dosímetro no tiene portadosímetro ensamblado.
                Escanee el código de barras con la pistola USB para ensamblarlo y asignarlo en un solo paso:
              </div>

              {!showManualList ? (
                <div>
                  <div className="flex gap-2">
                    <input
                      ref={barcodeInputRef}
                      type="text"
                      value={scannedBarcode}
                      onChange={(e) => setScannedBarcode(e.target.value)}
                      onKeyDown={handleBarcodeKeyDown}
                      placeholder="Dispare el lector USB aquí..."
                      disabled={validatingBarcode}
                      className="flex-1 px-3 py-1.5 border border-blue-400 rounded-md text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleValidateBarcode(scannedBarcode)}
                      disabled={validatingBarcode || !scannedBarcode}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md text-xs font-medium cursor-pointer"
                    >
                      {validatingBarcode ? 'Verificando...' : 'Verificar'}
                    </button>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[11px] text-gray-500">
                      Presione Enter o dispare el lector de barras.
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowManualList(true)}
                      className="text-[11px] text-blue-600 hover:underline"
                    >
                      Seleccionar de lista disponible
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <select
                    value={selectedHolderId}
                    onChange={(e) => handleSelectManualHolder(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
                  >
                    <option value="">-- Seleccionar portadosímetro disponible --</option>
                    {availableHolders.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.barcode} ({h.holder_color || 'Azul'} - {h.clip_type || 'Clip'})
                      </option>
                    ))}
                  </select>
                  <div className="text-right mt-1">
                    <button
                      type="button"
                      onClick={() => setShowManualList(false)}
                      className="text-[11px] text-blue-600 hover:underline"
                    >
                      ← Volver a escáner USB
                    </button>
                  </div>
                </div>
              )}

              {barcodeValidationMsg && (
                <div
                  className={`text-xs p-2 rounded border ${
                    barcodeValidationMsg.success
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}
                >
                  {barcodeValidationMsg.text}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECCIÓN 2: SELECCIÓN DEL TRABAJADOR POE */}
        <div className="space-y-3">
          <Input
            label="Buscar POE"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por nombre o documento..."
          />
          <Select
            label="Personal Ocupacionalmente Expuesto (POE)"
            value={workerId}
            onChange={(e) => setWorkerId(e.target.value)}
            required
          >
            <option value="">Seleccionar POE</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.full_name} — {w.clients?.name ?? 'Sin institución'}
              </option>
            ))}
          </Select>
        </div>

        {/* SECCIÓN 3: FECHA Y NOTAS */}
        <Input
          label="Fecha de asignación"
          type="date"
          value={assignedAt}
          onChange={(e) => setAssignedAt(e.target.value)}
          max={today()}
          required
        />
        <Textarea
          label="Notas de asignación"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Observaciones de entrega o período de monitoreo..."
        />

        <FormFooter
          error={error}
          loading={loading}
          submitLabel={
            loading
              ? 'Asignando...'
              : !initialHolder && holder
              ? 'Ensamblar y Asignar'
              : 'Asignar dosímetro'
          }
          onClose={onClose}
        />
      </form>
    </Modal>
  );
}
