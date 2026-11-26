import { useState, useRef, useEffect, useCallback } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import type {
  Dosimeter,
  DosimeterCondition,
  CreateDosimeterPayload,
  UpdateDosimeterPayload,
  ValidatedDosimeterInfo,
} from '../../api/dosimeters.api';
import {
  createDosimeter,
  updateDosimeter,
  uploadDosimeterPhoto,
  validateDosimeterBarcode,
} from '../../api/dosimeters.api';
import type { DosimeterType } from '../../api/catalogs.api';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { FormFooter } from '../ui/FormFooter';
import { FormSection } from '../ui/FormSection';
import { DosimeterCollisionAlertModal } from './DosimeterCollisionAlertModal';
import { CONDITIONS } from '../../constants/dosimeters';
import { extractApiError } from '../../utils/api';
import { isDateNotFuture, isDateAfterOrEqual } from '../../utils/validation';
import { today } from '../../utils/date';

interface Props {
  dosimeter?: Dosimeter | null;
  types: DosimeterType[];
  onClose: () => void;
  onSuccess: (msg?: string) => void;
  onViewDetails?: (dosimeterId: string) => void;
}

export function DosimeterFormModal({
  dosimeter,
  types,
  onClose,
  onSuccess,
  onViewDetails,
}: Props) {
  const isEditing = !!dosimeter;

  // Código de barras y modo escáner
  const [hasPhysicalBarcode, setHasPhysicalBarcode] = useState(true);
  const [barcode, setBarcode] = useState(dosimeter?.barcode ?? '');
  const [continuousScanMode, setContinuousScanMode] = useState(false);
  const [validatingBarcode, setValidatingBarcode] = useState(false);
  const [isValidBarcode, setIsValidBarcode] = useState<boolean | null>(null);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [collidedDosimeter, setCollidedDosimeter] = useState<ValidatedDosimeterInfo | null>(null);
  const [isBarcodeFocused, setIsBarcodeFocused] = useState(true);

  // Identificación
  const [serialNumber, setSerialNumber] = useState(dosimeter?.serial_number ?? '');
  const [dosimeterTypeId, setDosimeterTypeId] = useState(
    dosimeter?.dosimeter_types?.id ?? (types[0]?.id || ''),
  );
  const [internalCode, setInternalCode] = useState(dosimeter?.internal_code ?? '');
  const [lotNumber, setLotNumber] = useState(dosimeter?.lot_number ?? '');
  const [manufacturer, setManufacturer] = useState(dosimeter?.manufacturer ?? '');
  const [model, setModel] = useState(dosimeter?.model ?? '');

  // Parámetros de uso
  const [manufactureDate, setManufactureDate] = useState(dosimeter?.manufacture_date ?? '');
  const [commissioningDate, setCommissioningDate] = useState(dosimeter?.commissioning_date ?? '');
  const [wearPeriodDays, setWearPeriodDays] = useState(
    dosimeter?.wear_period_days != null ? String(dosimeter.wear_period_days) : '30',
  );
  const [maxDoseLimit, setMaxDoseLimit] = useState(
    dosimeter?.max_dose_limit != null ? String(dosimeter.max_dose_limit) : '50',
  );

  // Estado físico
  const [lastAnnealingDate, setLastAnnealingDate] = useState(
    dosimeter?.last_annealing_date ?? '',
  );
  const [currentCondition, setCurrentCondition] = useState<DosimeterCondition | ''>(
    dosimeter?.current_condition ?? 'normal',
  );
  const [reusable, setReusable] = useState(dosimeter?.reusable ?? true);
  const [photoUrl, setPhotoUrl] = useState(dosimeter?.photo_url ?? '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(dosimeter?.photo_url ?? '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notes, setNotes] = useState(dosimeter?.notes ?? '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successCount, setSuccessCount] = useState(0);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const focusTimersRef = useRef<number[]>([]);

  // Enfoque garantizado en el campo de código de barras
  const focusBarcodeInput = useCallback(() => {
    if (isEditing || !hasPhysicalBarcode) return;
    barcodeInputRef.current?.focus();
    barcodeInputRef.current?.select();
    const t1 = window.setTimeout(() => barcodeInputRef.current?.focus(), 60);
    const t2 = window.setTimeout(() => barcodeInputRef.current?.focus(), 250);
    focusTimersRef.current.push(t1, t2);
  }, [hasPhysicalBarcode, isEditing]);

  useEffect(() => {
    const timers = focusTimersRef.current;
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  useEffect(() => {
    focusBarcodeInput();
  }, [focusBarcodeInput, hasPhysicalBarcode]);

  // Validar código de barras contra el backend
  const checkBarcodeAvailability = useCallback(async (codeToValidate: string) => {
    const cleanCode = codeToValidate.trim();
    if (!cleanCode || cleanCode.length < 3) {
      setIsValidBarcode(null);
      setValidationMsg(null);
      return false;
    }

    try {
      setValidatingBarcode(true);
      setError('');
      const res = await validateDosimeterBarcode(cleanCode);

      if (res.exists && res.dosimeter) {
        setIsValidBarcode(false);
        setValidationMsg(res.message);
        setCollidedDosimeter(res.dosimeter);
        return false;
      } else {
        setIsValidBarcode(true);
        setValidationMsg(res.message);
        return true;
      }
    } catch (err: unknown) {
      setError(extractApiError(err, 'Error al validar código de barras.'));
      return false;
    } finally {
      setValidatingBarcode(false);
    }
  }, []);

  // Interceptor del lector USB cuando no está enfocado el input
  useEffect(() => {
    if (isEditing || !hasPhysicalBarcode) return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleWindowKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isOtherEditable =
        target &&
        target !== barcodeInputRef.current &&
        (target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          (target.tagName === 'INPUT' &&
            !['checkbox', 'radio'].includes((target as HTMLInputElement).type)));

      if (target === barcodeInputRef.current) return;
      if (isOtherEditable) return;

      const currentTime = Date.now();
      const diff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          e.preventDefault();
          const scannedCode = buffer.trim();
          buffer = '';
          setBarcode(scannedCode);
          if (!serialNumber.trim()) {
            setSerialNumber(scannedCode);
          }
          checkBarcodeAvailability(scannedCode);
        }
        buffer = '';
        return;
      }

      if (diff > 75) {
        buffer = '';
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [checkBarcodeAvailability, hasPhysicalBarcode, isEditing, serialNumber]);

  const handleBarcodeKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const rawCode = e.currentTarget.value || barcode || '';
      const code = rawCode.trim();
      if (!code) return;

      if (!serialNumber.trim()) {
        setSerialNumber(code);
      }

      const isAvailable = await checkBarcodeAvailability(code);

      // Si está en escaneo continuo y es válido, intentar guardar de inmediato
      if (isAvailable && continuousScanMode) {
        await executeSubmit(code);
      }
    }
  };

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

  const executeSubmit = async (overrideBarcode?: string) => {
    setError('');

    const targetBarcode = (overrideBarcode || barcode).trim();
    const finalSerial = serialNumber.trim() || targetBarcode;

    if (!finalSerial) {
      setError('El número de serie es obligatorio');
      return;
    }

    if (!dosimeterTypeId) {
      setError('Debe seleccionar un tipo de dosímetro');
      return;
    }

    if (wearPeriodDays) {
      const days = Number(wearPeriodDays);
      if (isNaN(days) || days < 1 || days > 365) {
        setError('El período de uso debe estar entre 1 y 365 días');
        return;
      }
    }

    if (maxDoseLimit) {
      const dose = Number(maxDoseLimit);
      if (isNaN(dose) || dose < 0 || dose > 1000) {
        setError('El límite máximo de dosis debe estar entre 0 y 1000 mSv');
        return;
      }
    }

    if (manufactureDate && !isDateNotFuture(manufactureDate)) {
      setError('La fecha de fabricación no puede ser una fecha futura');
      return;
    }

    if (commissioningDate && manufactureDate && !isDateAfterOrEqual(commissioningDate, manufactureDate)) {
      setError('La fecha de puesta en servicio debe ser posterior o igual a la fecha de fabricación');
      return;
    }

    if (lastAnnealingDate && !isDateNotFuture(lastAnnealingDate)) {
      setError('La fecha del último recocido no puede ser una fecha futura');
      return;
    }

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
        if (targetBarcode && targetBarcode !== dosimeter.barcode) payload.barcode = targetBarcode;
        if (finalSerial !== dosimeter.serial_number) payload.serial_number = finalSerial;
        if (dosimeterTypeId !== dosimeter.dosimeter_types?.id)
          payload.dosimeter_type_id = dosimeterTypeId;
        if (internalCode !== (dosimeter.internal_code ?? '')) payload.internal_code = internalCode || undefined;
        if (lotNumber !== (dosimeter.lot_number ?? '')) payload.lot_number = lotNumber || undefined;
        if (manufacturer !== (dosimeter.manufacturer ?? ''))
          payload.manufacturer = manufacturer || undefined;
        if (model !== (dosimeter.model ?? '')) payload.model = model || undefined;
        if (manufactureDate !== (dosimeter.manufacture_date ?? ''))
          payload.manufacture_date = manufactureDate || undefined;
        if (commissioningDate !== (dosimeter.commissioning_date ?? ''))
          payload.commissioning_date = commissioningDate || undefined;
        const wearPeriodNum = wearPeriodDays ? Number(wearPeriodDays) : undefined;
        if (wearPeriodNum !== (dosimeter.wear_period_days ?? undefined))
          payload.wear_period_days = wearPeriodNum;
        const maxDoseNum = maxDoseLimit ? Number(maxDoseLimit) : undefined;
        if (maxDoseNum !== (dosimeter.max_dose_limit ?? undefined))
          payload.max_dose_limit = maxDoseNum;
        if (lastAnnealingDate !== (dosimeter.last_annealing_date ?? ''))
          payload.last_annealing_date = lastAnnealingDate || undefined;
        if (currentCondition && currentCondition !== dosimeter.current_condition)
          payload.current_condition = currentCondition;
        if (reusable !== dosimeter.reusable) payload.reusable = reusable;
        if (finalPhotoUrl !== (dosimeter.photo_url ?? ''))
          payload.photo_url = finalPhotoUrl || undefined;
        if (notes !== (dosimeter.notes ?? '')) payload.notes = notes || undefined;

        if (Object.keys(payload).length === 0) {
          setError('No hay cambios para guardar');
          return;
        }
        await updateDosimeter(dosimeter.id, payload);
        onClose();
        onSuccess('Dosímetro actualizado exitosamente');
      } else {
        const payload: CreateDosimeterPayload = {
          serial_number: finalSerial,
          dosimeter_type_id: dosimeterTypeId,
          barcode: hasPhysicalBarcode ? targetBarcode : undefined,
          auto_generate_barcode: !hasPhysicalBarcode || !targetBarcode,
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

        const created = await createDosimeter(payload);

        if (continuousScanMode) {
          setSuccessCount((prev) => prev + 1);
          setBarcode('');
          setSerialNumber('');
          setIsValidBarcode(null);
          setValidationMsg(null);
          focusBarcodeInput();
        } else {
          onClose();
          onSuccess(`Dosímetro ${created.serial_number} (${created.barcode}) creado exitosamente`);
        }
      }
    } catch (err) {
      setError(extractApiError(err, 'Error al guardar el dosímetro'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    executeSubmit();
  };

  return (
    <>
      <Modal
        title={isEditing ? 'Editar dosímetro' : 'Registrar Nuevo Dosímetro'}
        onClose={onClose}
      >
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
          {/* Panel de Escaneo USB (Solo en modo creación) */}
          {!isEditing && (
            <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 p-4 rounded-xl border border-blue-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                  <span>⚡</span> Identificación por Escáner USB
                </span>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 font-medium">¿Tiene código físico?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setHasPhysicalBarcode(!hasPhysicalBarcode);
                      setIsValidBarcode(null);
                      setValidationMsg(null);
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      hasPhysicalBarcode ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        hasPhysicalBarcode ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="text-xs font-semibold text-gray-700 w-8">
                    {hasPhysicalBarcode ? 'SÍ' : 'NO'}
                  </span>
                </div>
              </div>

              {hasPhysicalBarcode ? (
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      ref={barcodeInputRef}
                      type="text"
                      value={barcode}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBarcode(val);
                        if (!val.trim()) {
                          setIsValidBarcode(null);
                          setValidationMsg(null);
                        }
                      }}
                      onKeyDown={handleBarcodeKeyDown}
                      onFocus={() => setIsBarcodeFocused(true)}
                      onBlur={() => {
                        setIsBarcodeFocused(false);
                        if (barcode.trim().length >= 3) {
                          checkBarcodeAvailability(barcode.trim());
                        }
                      }}
                      placeholder="Dispare el lector aquí o escriba el código..."
                      className={`w-full font-mono text-base font-semibold px-4 py-2.5 rounded-lg border transition-all ${
                        isValidBarcode === true
                          ? 'border-green-500 bg-green-50/50 focus:ring-2 focus:ring-green-400'
                          : isValidBarcode === false
                          ? 'border-red-500 bg-red-50/50 focus:ring-2 focus:ring-red-400'
                          : 'border-blue-300 bg-white focus:ring-2 focus:ring-blue-500'
                      }`}
                    />

                    <div className="absolute right-3 top-2.5 flex items-center gap-2">
                      {validatingBarcode && (
                        <span className="text-xs text-blue-600 animate-pulse">Verificando...</span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          isBarcodeFocused
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isBarcodeFocused ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                          }`}
                        />
                        {isBarcodeFocused ? 'Lector USB Listo' : 'Clic para enfocar'}
                      </span>
                    </div>
                  </div>

                  {validationMsg && (
                    <p
                      className={`text-xs font-medium flex items-center gap-1 ${
                        isValidBarcode ? 'text-green-700' : 'text-red-600'
                      }`}
                    >
                      <span>{isValidBarcode ? '✓' : '⚠️'}</span> {validationMsg}
                    </p>
                  )}

                  {/* Modo de escaneo continuo */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium">
                      <input
                        type="checkbox"
                        checked={continuousScanMode}
                        onChange={(e) => setContinuousScanMode(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Modo Escaneo Continuo (alta en lote sin cerrar modal)</span>
                    </label>

                    {successCount > 0 && (
                      <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                        {successCount} dosímetro(s) enrolado(s)
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-blue-100/60 p-3 rounded-lg border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
                  <span className="text-base shrink-0">ℹ️</span>
                  <div>
                    <p className="font-semibold">Autogeneración Correlativa Activada</p>
                    <p className="text-blue-700 mt-0.5">
                      El sistema asignará automáticamente un código único garantizado con el formato{' '}
                      <strong className="font-mono">DOS-YYYYMM-XXXX</strong> al confirmar el registro.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Identificación */}
          <FormSection label="Identificación del Dosímetro" color="bg-blue-500">
            <div className="grid grid-cols-2 gap-4">
              {isEditing ? (
                <Input
                  label="Código de barras"
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="DOS-YYYYMM-XXXX"
                  className="font-mono font-semibold"
                />
              ) : null}

              <Input
                label="Número de serie del fabricante"
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                required
                minLength={3}
                maxLength={50}
                placeholder="Ej: TF-8807-001001"
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
                    {t.name} ({t.technology})
                  </option>
                ))}
              </Select>

              <Input
                label="Código interno patrimonial"
                type="text"
                value={internalCode}
                onChange={(e) => setInternalCode(e.target.value)}
                maxLength={50}
                placeholder="Ej: LAB-TLD-001"
              />

              <Input
                label="Número de lote"
                type="text"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                maxLength={50}
                placeholder="Ej: LOT-2024-A"
              />

              <Input
                label="Fabricante"
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                maxLength={100}
                placeholder="Ej: Thermo Fisher, Landauer"
              />

              <Input
                label="Modelo"
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                maxLength={100}
                placeholder="Ej: Harshaw 8807, Panasonic UD-802"
              />
            </div>
          </FormSection>

          {/* Parámetros de uso */}
          <FormSection label="Parámetros de Uso y Calibración" color="bg-violet-400">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Fecha de fabricación"
                type="date"
                value={manufactureDate}
                onChange={(e) => setManufactureDate(e.target.value)}
                max={today()}
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
                max={365}
                value={wearPeriodDays}
                onChange={(e) => setWearPeriodDays(e.target.value)}
              />
              <Input
                label="Límite máximo de dosis (mSv)"
                type="number"
                step="any"
                min={0}
                max={1000}
                value={maxDoseLimit}
                onChange={(e) => setMaxDoseLimit(e.target.value)}
              />
            </div>
          </FormSection>

          {/* Estado físico */}
          <FormSection label="Condición Física y Trazabilidad" color="bg-amber-400">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Último recocido (annealing)"
                type="date"
                value={lastAnnealingDate}
                onChange={(e) => setLastAnnealingDate(e.target.value)}
                max={today()}
              />

              <Select
                label="Condición física actual"
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

              <div className="col-span-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reusable}
                    onChange={(e) => setReusable(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Dosímetro reutilizable (permite nuevos ciclos de asignación)</span>
                </label>
              </div>

              {/* Fotografía del dosímetro */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fotografía de inspección visual
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
                    <p className="text-xs text-gray-400 mt-1">
                      Formatos admitidos: JPG, PNG, WebP (máx. 5 MB)
                    </p>
                  </div>
                )}
              </div>

              <div className="col-span-2">
                <Textarea
                  label="Notas de trazabilidad"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Observaciones de ingreso, calibración o lote..."
                />
              </div>
            </div>
          </FormSection>

          <FormFooter
            error={error}
            loading={loading}
            isEditing={isEditing}
            editLabel="Guardar cambios"
            createLabel={continuousScanMode ? 'Registrar y Continuar (Enter)' : 'Crear dosímetro'}
            onClose={onClose}
          />
        </form>
      </Modal>

      {/* Modal de Alerta Preventiva de Colisión de Código de Barras */}
      {collidedDosimeter && (
        <DosimeterCollisionAlertModal
          dosimeter={collidedDosimeter}
          onClose={() => {
            setCollidedDosimeter(null);
            setBarcode('');
            if (serialNumber === collidedDosimeter.barcode) {
              setSerialNumber('');
            }
            setIsValidBarcode(null);
            setValidationMsg(null);
            focusBarcodeInput();
          }}
          onViewDetails={(id) => {
            setCollidedDosimeter(null);
            onClose();
            if (onViewDetails) {
              onViewDetails(id);
            }
          }}
        />
      )}
    </>
  );
}
