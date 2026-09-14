import { useState, useRef } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import type {
  Dosimeter,
  DosimeterCondition,
  CreateDosimeterPayload,
  UpdateDosimeterPayload,
} from '../../api/dosimeters.api';
import { createDosimeter, updateDosimeter, uploadDosimeterPhoto } from '../../api/dosimeters.api';
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
  const [manufacturer, setManufacturer] = useState(dosimeter?.manufacturer ?? '');
  const [model, setModel] = useState(dosimeter?.model ?? '');

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
  const [photoUrl, setPhotoUrl] = useState(dosimeter?.photo_url ?? '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(dosimeter?.photo_url ?? '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notes, setNotes] = useState(dosimeter?.notes ?? '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('La fotografía no debe superar los 5 MB');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setPhotoUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let finalPhotoUrl = photoUrl;
      if (selectedFile) {
        const uploadResult = await uploadDosimeterPhoto(selectedFile);
        finalPhotoUrl = uploadResult.url;
      } else if (!previewUrl) {
        finalPhotoUrl = '';
      }

      if (isEditing && dosimeter) {
        const payload: UpdateDosimeterPayload = {};
        if (serialNumber !== dosimeter.serial_number) payload.serial_number = serialNumber;
        if (dosimeterTypeId !== dosimeter.dosimeter_types.id)
          payload.dosimeter_type_id = dosimeterTypeId;
        if (internalCode !== (dosimeter.internal_code ?? '')) payload.internal_code = internalCode;
        if (lotNumber !== (dosimeter.lot_number ?? '')) payload.lot_number = lotNumber;
        if (manufacturer !== (dosimeter.manufacturer ?? ''))
          payload.manufacturer = manufacturer || undefined;
        if (model !== (dosimeter.model ?? '')) payload.model = model || undefined;
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
        if (finalPhotoUrl !== (dosimeter.photo_url ?? ''))
          payload.photo_url = finalPhotoUrl || undefined;
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
        if (manufacturer) payload.manufacturer = manufacturer;
        if (model) payload.model = model;
        if (manufactureDate) payload.manufacture_date = manufactureDate;
        if (commissioningDate) payload.commissioning_date = commissioningDate;
        if (wearPeriodDays) payload.wear_period_days = Number(wearPeriodDays);
        if (maxDoseLimit) payload.max_dose_limit = Number(maxDoseLimit);
        if (lastAnnealingDate) payload.last_annealing_date = lastAnnealingDate;
        if (currentCondition) payload.current_condition = currentCondition;
        payload.reusable = reusable;
        if (finalPhotoUrl) payload.photo_url = finalPhotoUrl;
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
            <Input
              label="Fabricante"
              type="text"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              placeholder="Ej: Thermo Fisher, Landauer"
            />
            <Input
              label="Modelo"
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Ej: Harshaw 8807, Panasonic UD-802"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fotografía del dosímetro
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileSelect}
              />
              {previewUrl ? (
                <div className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <img
                    src={previewUrl}
                    alt="Vista previa"
                    className="w-16 h-16 object-cover rounded-md border border-gray-200"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">
                      {selectedFile ? selectedFile.name : 'Fotografía guardada'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {selectedFile
                        ? `${(selectedFile.size / 1024).toFixed(0)} KB`
                        : 'Almacenada en Supabase Storage'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs px-2.5 py-1.5 font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                    >
                      Cambiar
                    </button>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="text-xs px-2.5 py-1.5 font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors cursor-pointer"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-lg p-4 text-center cursor-pointer transition-colors bg-gray-50 hover:bg-blue-50/40"
                >
                  <p className="text-xs font-medium text-gray-700">
                    Haz clic aquí para seleccionar una imagen desde tu dispositivo
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Formatos admitidos: JPG, PNG, WebP (máx. 5 MB)</p>
                </div>
              )}
            </div>
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
