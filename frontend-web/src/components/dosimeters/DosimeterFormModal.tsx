import { useState } from 'react';
import type { FormEvent } from 'react';
import type {
  Dosimeter,
  DosimeterCondition,
  CreateDosimeterPayload,
  UpdateDosimeterPayload,
} from '../../api/dosimeters.api';
import { createDosimeter, updateDosimeter } from '../../api/dosimeters.api';
import type { DosimeterType } from '../../api/catalogs.api';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

interface Props {
  dosimeter?: Dosimeter | null;
  types: DosimeterType[];
  onClose: () => void;
  onSuccess: () => void;
}

const CONDITIONS: { value: DosimeterCondition; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'danado', label: 'Dañado' },
  { value: 'contaminado', label: 'Contaminado' },
  { value: 'perdido', label: 'Perdido' },
];

const sectionHead = (label: string, color: string) => (
  <div className="flex items-center gap-2 mb-3">
    <div className={`w-1 h-4 rounded-full ${color}`} />
    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</h3>
  </div>
);

export function DosimeterFormModal({ dosimeter, types, onClose, onSuccess }: Props) {
  const isEditing = !!dosimeter;

  // Identificación
  const [serialNumber, setSerialNumber] = useState(dosimeter?.serial_number ?? '');
  const [dosimeterTypeId, setDosimeterTypeId] = useState(dosimeter?.dosimeter_types.id ?? '');
  const [internalCode, setInternalCode] = useState(dosimeter?.internal_code ?? '');
  const [lotNumber, setLotNumber] = useState(dosimeter?.lot_number ?? '');

  // Parámetros de uso
  const [manufactureDate, setManufactureDate] = useState(dosimeter?.manufacture_date ?? '');
  const [commissioningDate, setCommissioningDate] = useState(dosimeter?.commissioning_date ?? '');
  const [wearPeriodDays, setWearPeriodDays] = useState(
    dosimeter?.wear_period_days != null ? String(dosimeter.wear_period_days) : '',
  );
  const [maxDoseLimit, setMaxDoseLimit] = useState(
    dosimeter?.max_dose_limit != null ? String(dosimeter.max_dose_limit) : '',
  );

  // Estado físico
  const [lastAnnealingDate, setLastAnnealingDate] = useState(
    dosimeter?.last_annealing_date ?? '',
  );
  const [currentCondition, setCurrentCondition] = useState<DosimeterCondition | ''>(
    dosimeter?.current_condition ?? '',
  );
  const [reusable, setReusable] = useState(dosimeter?.reusable ?? true);
  const [notes, setNotes] = useState(dosimeter?.notes ?? '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isEditing && dosimeter) {
        const payload: UpdateDosimeterPayload = {};
        if (serialNumber !== dosimeter.serial_number) payload.serial_number = serialNumber;
        if (dosimeterTypeId !== dosimeter.dosimeter_types.id)
          payload.dosimeter_type_id = dosimeterTypeId;
        if (internalCode !== (dosimeter.internal_code ?? '')) payload.internal_code = internalCode;
        if (lotNumber !== (dosimeter.lot_number ?? '')) payload.lot_number = lotNumber;
        if (manufactureDate !== (dosimeter.manufacture_date ?? ''))
          payload.manufacture_date = manufactureDate;
        if (commissioningDate !== (dosimeter.commissioning_date ?? ''))
          payload.commissioning_date = commissioningDate;
        const wearPeriodNum = wearPeriodDays ? Number(wearPeriodDays) : undefined;
        if (wearPeriodNum !== (dosimeter.wear_period_days ?? undefined))
          payload.wear_period_days = wearPeriodNum;
        const maxDoseNum = maxDoseLimit ? Number(maxDoseLimit) : undefined;
        if (maxDoseNum !== (dosimeter.max_dose_limit ?? undefined))
          payload.max_dose_limit = maxDoseNum;
        if (lastAnnealingDate !== (dosimeter.last_annealing_date ?? ''))
          payload.last_annealing_date = lastAnnealingDate;
        if (currentCondition && currentCondition !== dosimeter.current_condition)
          payload.current_condition = currentCondition;
        if (reusable !== dosimeter.reusable) payload.reusable = reusable;
        if (notes !== (dosimeter.notes ?? '')) payload.notes = notes;

        if (Object.keys(payload).length === 0) {
          setError('No hay cambios para guardar');
          return;
        }
        await updateDosimeter(dosimeter.id, payload);
      } else {
        const payload: CreateDosimeterPayload = {
          serial_number: serialNumber,
          dosimeter_type_id: dosimeterTypeId,
        };
        if (internalCode) payload.internal_code = internalCode;
        if (lotNumber) payload.lot_number = lotNumber;
        if (manufactureDate) payload.manufacture_date = manufactureDate;
        if (commissioningDate) payload.commissioning_date = commissioningDate;
        if (wearPeriodDays) payload.wear_period_days = Number(wearPeriodDays);
        if (maxDoseLimit) payload.max_dose_limit = Number(maxDoseLimit);
        if (lastAnnealingDate) payload.last_annealing_date = lastAnnealingDate;
        if (currentCondition) payload.current_condition = currentCondition;
        payload.reusable = reusable;
        if (notes) payload.notes = notes;
        await createDosimeter(payload);
      }

      onClose();
      onSuccess();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e?.response?.data?.message ?? 'Error al guardar el dosímetro';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={isEditing ? 'Editar dosímetro' : 'Nuevo dosímetro'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
        {/* Identificación */}
        <div>
          {sectionHead('Identificación', 'bg-blue-500')}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Número de serie"
              type="text"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              required
              placeholder="SN-000123"
            />
            <Select
              label="Tipo de dosímetro"
              value={dosimeterTypeId}
              onChange={(e) => setDosimeterTypeId(e.target.value)}
              required
            >
              <option value="">Seleccionar tipo</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            <Input
              label="Código interno"
              type="text"
              value={internalCode}
              onChange={(e) => setInternalCode(e.target.value)}
              placeholder="INT-000123"
            />
            <Input
              label="Número de lote"
              type="text"
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
            />
          </div>
        </div>

        {/* Parámetros de uso */}
        <div>
          {sectionHead('Parámetros de uso', 'bg-violet-400')}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha de fabricación"
              type="date"
              value={manufactureDate}
              onChange={(e) => setManufactureDate(e.target.value)}
            />
            <Input
              label="Fecha de puesta en servicio"
              type="date"
              value={commissioningDate}
              onChange={(e) => setCommissioningDate(e.target.value)}
            />
            <Input
              label="Período de uso (días)"
              type="number"
              min={1}
              value={wearPeriodDays}
              onChange={(e) => setWearPeriodDays(e.target.value)}
            />
            <Input
              label="Límite máximo de dosis"
              type="number"
              step="any"
              value={maxDoseLimit}
              onChange={(e) => setMaxDoseLimit(e.target.value)}
            />
          </div>
        </div>

        {/* Estado físico */}
        <div>
          {sectionHead('Estado físico', 'bg-amber-400')}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Último recocido (annealing)"
              type="date"
              value={lastAnnealingDate}
              onChange={(e) => setLastAnnealingDate(e.target.value)}
            />
            <Select
              label="Condición actual"
              value={currentCondition}
              onChange={(e) => setCurrentCondition(e.target.value as DosimeterCondition)}
            >
              <option value="">{isEditing ? 'Sin cambios' : 'Normal (por defecto)'}</option>
              {CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
            <label className="flex items-center gap-2 text-sm text-gray-700 mt-1">
              <input
                type="checkbox"
                checked={reusable}
                onChange={(e) => setReusable(e.target.checked)}
                className="cursor-pointer"
              />
              Reutilizable
            </label>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear dosímetro'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
