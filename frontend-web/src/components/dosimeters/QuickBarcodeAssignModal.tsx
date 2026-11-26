import { useState, useRef, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { FormFooter } from '../ui/FormFooter';
import type { Worker } from '../../api/workers.api';
import { getWorkers } from '../../api/workers.api';
import type { Dosimeter, HolderDosimeter, HolderStatus } from '../../api/dosimeters.api';
import {
  validateHolderBarcode,
  validateDosimeterBarcode,
  getDosimeters,
  getHolders,
  assignDosimeter,
} from '../../api/dosimeters.api';
import { useDebounce } from '../../hooks/useDebounce';
import { extractApiError } from '../../utils/api';
import { today } from '../../utils/date';
import { isDateNotFuture } from '../../utils/validation';

interface Props {
  onClose: () => void;
  onSuccess: (message?: string) => void;
}

export function QuickBarcodeAssignModal({ onClose, onSuccess }: Props) {
  // Step 1: Holder Barcode Scanning
  const [barcode, setBarcode] = useState('');
  const [validating, setValidating] = useState(false);
  const [holder, setHolder] = useState<HolderDosimeter | null>(null);
  const [activeDosimeter, setActiveDosimeter] = useState<{
    id: string;
    serial_number: string;
    type?: string;
  } | null>(null);

  // If holder is not yet assembled, technician selects an available dosimeter
  const [availableDosimeters, setAvailableDosimeters] = useState<Dosimeter[]>([]);
  const [selectedDosimeterId, setSelectedDosimeterId] = useState('');

  // Step 2: Worker POE
  const [workerSearch, setWorkerSearch] = useState('');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workerId, setWorkerId] = useState('');
  const [assignedAt, setAssignedAt] = useState(today());
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanMessage, setScanMessage] = useState<{
    success: boolean;
    text: string;
  } | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const debouncedWorkerSearch = useDebounce(workerSearch, 300);

  // Autofocus USB Scanner Input
  useEffect(() => {
    const timer = setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Worker Search
  useEffect(() => {
    getWorkers({ search: debouncedWorkerSearch || undefined, status: 'active', limit: 20 })
      .then((res) => setWorkers(res.items))
      .catch(() => setWorkers([]));
  }, [debouncedWorkerSearch]);

  // Load available dosimeters if holder needs assembly
  useEffect(() => {
    if (holder && !activeDosimeter) {
      getDosimeters({ status_code: 'DISPONIBLE', limit: 50 })
        .then((res) => {
          const unassigned = res.items.filter((d) => !d.active_holder);
          setAvailableDosimeters(unassigned);
        })
        .catch(() => setAvailableDosimeters([]));
    }
  }, [holder, activeDosimeter]);

  // Handle Barcode Scan
  const handleScan = async (code: string) => {
    const clean = code.trim();
    if (!clean) return;

    setSelectedDosimeterId('');
    setValidating(true);
    setScanMessage(null);
    setError('');
    try {
      // 1. Intentar resolver como Portadosímetro
      const res = await validateHolderBarcode(clean);
      if (res.exists && res.holder) {
        const h = res.holder;
        if (['en_campo', 'baja', 'en_triaje', 'danado'].includes(h.status)) {
          setScanMessage({
            success: false,
            text: `El portadosímetro '${h.barcode}' no se encuentra apto para despacho (estado actual: ${h.status}).`,
          });
          setHolder(null);
          setActiveDosimeter(null);
          return;
        }

        if (['danado_grave', 'contaminado', 'perdido'].includes(h.current_condition)) {
          setScanMessage({
            success: false,
            text: `El portadosímetro presenta condición crítica (${h.current_condition}). No puede ser asignado.`,
          });
          setHolder(null);
          setActiveDosimeter(null);
          return;
        }

        setHolder(h);

        if (h.active_assembly?.dosimeter) {
          setActiveDosimeter({
            id: h.active_assembly.dosimeter.id,
            serial_number: h.active_assembly.dosimeter.serial_number,
            type: h.active_assembly.dosimeter.model,
          });
          setScanMessage({
            success: true,
            text: `Portadosímetro reconocido con dosímetro acoplado (${h.active_assembly.dosimeter.serial_number}).`,
          });
        } else {
          const { items } = await getDosimeters({ search: h.serial_number, status_code: 'DISPONIBLE', limit: 10 });
          const matchingDos = items.find((d) => d.serial_number === h.serial_number);
          if (matchingDos) {
            setActiveDosimeter({
              id: matchingDos.id,
              serial_number: matchingDos.serial_number,
              type: matchingDos.dosimeter_types?.name,
            });
            setScanMessage({
              success: true,
              text: `Portadosímetro emparejado con dosímetro ${matchingDos.serial_number}.`,
            });
          } else {
            setActiveDosimeter(null);
            setScanMessage({
              success: true,
              text: `Portadosímetro '${h.barcode}' libre. Seleccione el dosímetro a acoplar:`,
            });
          }
        }
        return;
      }

      // 2. Si no es un portadosímetro, intentar resolver como Dosímetro directo
      const dosRes = await validateDosimeterBarcode(clean);
      if (dosRes.exists && dosRes.dosimeter) {
        const d = dosRes.dosimeter;
        if (d.status_code && d.status_code !== 'DISPONIBLE') {
          setScanMessage({
            success: false,
            text: `El dosímetro '${d.serial_number}' no está disponible (estado actual: ${d.status_name || d.status_code}).`,
          });
          setHolder(null);
          setActiveDosimeter(null);
          return;
        }

        if (['danado', 'contaminado', 'perdido'].includes(d.current_condition)) {
          setScanMessage({
            success: false,
            text: `El dosímetro presenta condición física '${d.current_condition}'. No apto para despacho.`,
          });
          setHolder(null);
          setActiveDosimeter(null);
          return;
        }

        setActiveDosimeter({
          id: d.id,
          serial_number: d.serial_number,
          type: d.dosimeter_type_name,
        });

        if (d.active_holder) {
          if (['en_campo', 'baja', 'en_triaje', 'danado'].includes(d.active_holder.status)) {
            setScanMessage({
              success: false,
              text: `El portadosímetro acoplado '${d.active_holder.barcode}' no se encuentra apto (estado: ${d.active_holder.status}).`,
            });
            setHolder(null);
            setActiveDosimeter(null);
            return;
          }

          if (['danado_grave', 'contaminado', 'perdido'].includes(d.active_holder.current_condition || '')) {
            setScanMessage({
              success: false,
              text: `El portadosímetro acoplado presenta condición crítica (${d.active_holder.current_condition}). No puede ser asignado.`,
            });
            setHolder(null);
            setActiveDosimeter(null);
            return;
          }

          setHolder({
            id: d.active_holder.id,
            barcode: d.active_holder.barcode,
            serial_number: d.active_holder.serial_number,
            holder_color: d.active_holder.holder_color || 'azul',
            clip_type: d.active_holder.clip_type || 'pinza_cocodrilo',
            model: d.active_holder.model || undefined,
            current_condition: d.active_holder.current_condition || 'integro',
            status: d.active_holder.status as HolderStatus,
          });
          setScanMessage({
            success: true,
            text: `Dosímetro ${d.serial_number} detectado con portadosímetro activo (${d.active_holder.barcode}).`,
          });
        } else {
          // Si no tiene holder ensamblado, buscar holder disponible por serial
          const holdersRes = await getHolders({ search: d.serial_number, limit: 10 });
          const matchingHolder = (holdersRes.items || []).find(
            (h) => h.serial_number === d.serial_number && h.status === 'disponible',
          );
          if (matchingHolder) {
            setHolder(matchingHolder);
            setScanMessage({
              success: true,
              text: `Dosímetro ${d.serial_number} emparejado con portadosímetro disponible ${matchingHolder.barcode}.`,
            });
          } else {
            setHolder(null);
            setScanMessage({
              success: false,
              text: `Dosímetro ${d.serial_number} detectado sin portadosímetro disponible. Ensámblele un chasis o escanee el portadosímetro primero.`,
            });
            setActiveDosimeter(null);
            return;
          }
        }
        return;
      }

      // 3. No encontrado en ninguno
      setScanMessage({
        success: false,
        text: `El código '${clean}' no existe como portadosímetro ni como dosímetro registrado.`,
      });
      setHolder(null);
      setActiveDosimeter(null);
    } catch {
      setScanMessage({
        success: false,
        text: 'Error al validar el código de barras.',
      });
      setHolder(null);
      setActiveDosimeter(null);
    } finally {
      setValidating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScan(barcode);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const targetDosimeterId = activeDosimeter?.id || selectedDosimeterId;
    if (!targetDosimeterId) {
      setError('Debe seleccionar el dosímetro a ensamblar con este portadosímetro.');
      return;
    }
    if (!workerId) {
      setError('Seleccione un trabajador POE.');
      return;
    }
    if (!isDateNotFuture(assignedAt)) {
      setError('La fecha de asignación no puede ser una fecha futura.');
      return;
    }

    setLoading(true);
    try {
      await assignDosimeter(targetDosimeterId, {
        worker_id: workerId,
        assigned_at: assignedAt,
        notes: notes || undefined,
        holder_id: holder?.id,
        holder_barcode: holder?.barcode,
      });

      onSuccess(`Dosímetro asignado exitosamente${holder?.barcode ? ` con portadosímetro ${holder.barcode}` : ''}`);
      onClose();
    } catch (err) {
      setError(extractApiError(err, 'Error al procesar asignación rápida'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="⚡ Asignación Rápida con Escáner de Código de Barras"
      onClose={onClose}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        {/* ESCÁNER DE PORTADOSÍMETRO / DOSÍMETRO */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
          <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide">
            1. Escanear Portadosímetro o Dosímetro (Lector USB)
          </label>
          <div className="flex gap-2">
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Dispare el lector sobre el portadosímetro o dosímetro..."
              disabled={validating}
              className="flex-1 px-3 py-1.5 border border-blue-400 rounded-md text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => handleScan(barcode)}
              disabled={validating || !barcode}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md text-xs font-medium cursor-pointer"
            >
              {validating ? 'Buscando...' : 'Escanear'}
            </button>
          </div>

          {scanMessage && (
            <div
              className={`text-xs p-2 rounded border ${
                scanMessage.success
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {scanMessage.text}
            </div>
          )}

          {holder && (
            <div className="bg-white border border-slate-200 rounded p-2 text-xs space-y-1">
              <div className="flex justify-between font-medium text-slate-800">
                <span>Portadosímetro: {holder.barcode}</span>
                <span className="capitalize text-slate-500">{holder.holder_color || 'Azul'} ({holder.clip_type || 'Cocodrilo'})</span>
              </div>

              {activeDosimeter ? (
                <div className="text-emerald-700 font-semibold pt-0.5">
                  ✓ Dosímetro Vinculado: {activeDosimeter.serial_number}
                </div>
              ) : (
                <div className="pt-2 space-y-1">
                  <label className="block text-[11px] font-semibold text-amber-800">
                    Seleccionar Dosímetro disponible a insertar en este chasis:
                  </label>
                  <select
                    value={selectedDosimeterId}
                    onChange={(e) => setSelectedDosimeterId(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs bg-white"
                  >
                    <option value="">-- Seleccionar dosímetro disponible --</option>
                    {availableDosimeters.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.serial_number} — {d.dosimeter_types.name} ({d.current_condition})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SELECCIÓN DE TRABAJADOR POE */}
        <div className="space-y-3">
          <Input
            label="2. Buscar POE"
            type="text"
            value={workerSearch}
            onChange={(e) => setWorkerSearch(e.target.value)}
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

        {/* FECHA Y NOTAS */}
        <Input
          label="Fecha de asignación"
          type="date"
          value={assignedAt}
          onChange={(e) => setAssignedAt(e.target.value)}
          max={today()}
          required
        />
        <Textarea
          label="Notas"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Notas u observaciones de entrega..."
        />

        <FormFooter
          error={error}
          loading={loading}
          submitLabel={loading ? 'Asignando...' : 'Confirmar Asignación'}
          onClose={onClose}
        />
      </form>
    </Modal>
  );
}
