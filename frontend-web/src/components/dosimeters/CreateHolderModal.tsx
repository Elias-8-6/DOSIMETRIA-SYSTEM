import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { HolderCollisionAlertModal } from './HolderCollisionAlertModal';
import {
  createHolder,
  validateHolderBarcode,
  type HolderDosimeter,
  type CreateHolderPayload,
} from '../../api/dosimeters.api';

interface CreateHolderModalProps {
  onClose: () => void;
  onSuccess: (newHolder: HolderDosimeter) => void;
  onViewDetails?: (holder: HolderDosimeter) => void;
}

export function CreateHolderModal({
  onClose,
  onSuccess,
  onViewDetails,
}: CreateHolderModalProps) {
  // Controles del formulario
  const [hasPhysicalBarcode, setHasPhysicalBarcode] = useState(true);
  const [barcode, setBarcode] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [showAdvancedSerial, setShowAdvancedSerial] = useState(false);
  const [holderColor, setHolderColor] = useState('azul');
  const [clipType, setClipType] = useState('pinza_cocodrilo');
  const [model, setModel] = useState('');
  const [storageLocation, setStorageLocation] = useState('');
  const [currentCondition, setCurrentCondition] = useState('integro');
  const [notes, setNotes] = useState('');

  // Modo escaneo continuo (alta rápida sucesiva)
  const [continuousScanMode, setContinuousScanMode] = useState(false);

  // Estados de validación y carga
  const [validating, setValidating] = useState(false);
  const [isValidCode, setIsValidCode] = useState<boolean | null>(null);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(true);

  // Modal de colisión / duplicado
  const [collidedHolder, setCollidedHolder] = useState<HolderDosimeter | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const barcodeValueRef = useRef<string>('');
  const focusTimersRef = useRef<number[]>([]);

  // Mantener actualizado el ref con el valor actual del barcode para handlers asíncronos
  useEffect(() => {
    barcodeValueRef.current = barcode;
  }, [barcode]);

  const focusBarcodeInput = useCallback(() => {
    if (!hasPhysicalBarcode) return;
    // Múltiples intentos para asegurar que el input reciba el foco tras el montaje del Modal
    const node = barcodeInputRef.current;
    if (node) {
      node.focus();
      node.select();
    }
    const t1 = window.setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 50);
    const t2 = window.setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 200);
    focusTimersRef.current.push(t1, t2);
  }, [hasPhysicalBarcode]);

  // Limpieza de temporizadores de foco al desmontar
  useEffect(() => {
    const timers = focusTimersRef.current;
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  // Enfoque inicial garantizado al abrir el modal o cambiar el switch
  useEffect(() => {
    focusBarcodeInput();
  }, [focusBarcodeInput, hasPhysicalBarcode]);

  // Validar código de barras contra el backend
  const checkBarcodeAvailability = useCallback(async (codeToValidate: string) => {
    const cleanCode = codeToValidate.trim();
    if (!cleanCode || cleanCode.length < 3) {
      setIsValidCode(null);
      setValidationMsg(null);
      return false;
    }

    try {
      setValidating(true);
      setError(null);
      const res = await validateHolderBarcode(cleanCode);

      if (res.exists && res.holder) {
        setIsValidCode(false);
        setValidationMsg(res.message);
        // Abrir la ventana emergente de colisión solicitada
        setCollidedHolder(res.holder);
        return false;
      } else {
        setIsValidCode(true);
        setValidationMsg(res.message);
        return true;
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      setError(apiErr?.response?.data?.message || 'Error al validar código de barras.');
      return false;
    } finally {
      setValidating(false);
    }
  }, []);

  const executeCreate = useCallback(async (payload: CreateHolderPayload) => {
    try {
      setSaving(true);
      setError(null);
      const created = await createHolder(payload);
      onSuccess(created);

      if (continuousScanMode) {
        // En modo continuo, limpiar campo y reenfocar para el siguiente escaneo
        setBarcode('');
        setSerialNumber('');
        setIsValidCode(null);
        setValidationMsg(null);
        focusBarcodeInput();
      } else {
        onClose();
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      setError(apiErr?.response?.data?.message || 'Error al crear portadosímetro.');
    } finally {
      setSaving(false);
    }
  }, [continuousScanMode, focusBarcodeInput, onClose, onSuccess]);

  // Manejar lectura con pistola USB en el input (emulación de teclado enviando Enter)
  const handleBarcodeKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Leer directamente de e.currentTarget.value para evitar desincronizaciones de React ante ráfagas ultra-rápidas
      const rawCode = e.currentTarget.value || barcode || '';
      const code = rawCode.trim();
      if (!code) return;

      const isAvailable = await checkBarcodeAvailability(code);

      // Si está en modo de escaneo continuo y el código es válido, lo registra automáticamente
      if (isAvailable && continuousScanMode) {
        await executeCreate({
          barcode: code,
          serial_number: serialNumber.trim() || code,
          holder_color: holderColor,
          clip_type: clipType,
          model: model.trim() || undefined,
          storage_location: storageLocation.trim() || undefined,
          current_condition: currentCondition,
          notes: notes.trim() || undefined,
        });
      }
    }
  };

  // Interceptor global de eventos del lector USB en caso de que el foco no esté en el input
  useEffect(() => {
    if (!hasPhysicalBarcode) return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleWindowKeyDown = (e: KeyboardEvent) => {
      // Ignorar si se está escribiendo en textarea o en otros inputs editables específicos
      const target = e.target as HTMLElement | null;
      const isOtherEditable =
        target &&
        target !== barcodeInputRef.current &&
        (target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text'));

      // Si el evento ocurrió dentro del barcodeInputRef, el input ya lo procesa con handleBarcodeKeyDown
      if (target === barcodeInputRef.current) return;
      if (isOtherEditable) return;

      const currentTime = Date.now();
      const diff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      // Si se presiona Enter y el buffer tiene contenido (lector de código de barras)
      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          e.preventDefault();
          const scannedCode = buffer.trim();
          buffer = '';
          setBarcode(scannedCode);
          if (barcodeInputRef.current) {
            barcodeInputRef.current.value = scannedCode;
            barcodeInputRef.current.focus();
          }
          checkBarcodeAvailability(scannedCode).then((isAvailable) => {
            if (isAvailable && continuousScanMode) {
              executeCreate({
                barcode: scannedCode,
                serial_number: serialNumber.trim() || scannedCode,
                holder_color: holderColor,
                clip_type: clipType,
                model: model.trim() || undefined,
                storage_location: storageLocation.trim() || undefined,
                current_condition: currentCondition,
                notes: notes.trim() || undefined,
              });
            }
          });
          return;
        }
        buffer = '';
        return;
      }

      // Si no es tecla de control imprimible (caracteres de código de barras)
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Si el foco no está en el input, asegurar que el input reciba el foco
        if (document.activeElement !== barcodeInputRef.current) {
          barcodeInputRef.current?.focus();
        }

        // Si la cadencia entre teclas es rápida (< 75ms) es típico de un lector de código de barras USB
        if (diff < 75 || buffer.length === 0) {
          buffer += e.key;
        } else {
          buffer = e.key;
        }
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [hasPhysicalBarcode, continuousScanMode, serialNumber, holderColor, clipType, model, storageLocation, currentCondition, notes, checkBarcodeAvailability, executeCreate]);

  // Cierre de la ventana emergente de colisión
  const handleCloseCollisionModal = () => {
    setCollidedHolder(null);
    setBarcode('');
    setIsValidCode(null);
    setValidationMsg(null);
    focusBarcodeInput();
  };

  // Generar código único automático
  const handleGenerateBarcode = () => {
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const rand = Math.floor(1000 + Math.random() * 9000);
    const generated = `HLD-${ym}-${rand}`;
    setBarcode(generated);
    setIsValidCode(true);
    setValidationMsg(`Código único autogenerado: ${generated}`);
  };

  // Guardado manual
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPhysicalBarcode && !barcode) {
      handleGenerateBarcode();
    }

    const finalBarcode = barcode.trim();
    if (!finalBarcode && hasPhysicalBarcode) {
      setError('Por favor escanee o introduzca el código de barras.');
      focusBarcodeInput();
      return;
    }

    // Validar antes de guardar si aún no ha sido validado
    if (isValidCode !== true) {
      const available = await checkBarcodeAvailability(finalBarcode);
      if (!available) return;
    }

    const payload: CreateHolderPayload = {
      barcode: finalBarcode,
      serial_number: serialNumber.trim() || finalBarcode,
      holder_color: holderColor,
      clip_type: clipType,
      model: model.trim() || undefined,
      storage_location: storageLocation.trim() || undefined,
      current_condition: currentCondition,
      notes: notes.trim() || undefined,
    };

    await executeCreate(payload);
  };

  return (
    <>
      <Modal
        title="Registrar Nuevo Portadosímetro"
        onClose={onClose}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs rounded">
              {error}
            </div>
          )}

          {/* Switch de código físico vs generación (con tabIndex -1 para no robar foco) */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  tabIndex={-1}
                  checked={hasPhysicalBarcode}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setHasPhysicalBarcode(checked);
                    setBarcode('');
                    setIsValidCode(null);
                    setValidationMsg(null);
                    if (!checked) {
                      handleGenerateBarcode();
                    } else {
                      focusBarcodeInput();
                    }
                  }}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-sm font-semibold text-gray-800">
                  ¿El chasis ya tiene etiqueta / código de barras físico?
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-0.5 ml-6">
                {hasPhysicalBarcode
                  ? 'Listo para recibir lectura con lector USB / emulación de teclado.'
                  : 'Se generará un código correlativo único para imprimir etiqueta nueva.'}
              </p>
            </div>

            {hasPhysicalBarcode && (
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 self-start sm:self-auto">
                <input
                  type="checkbox"
                  tabIndex={-1}
                  checked={continuousScanMode}
                  onChange={(e) => setContinuousScanMode(e.target.checked)}
                  className="w-3.5 h-3.5 text-blue-600 rounded cursor-pointer"
                />
                <span>Modo Escaneo Continuo</span>
              </label>
            )}
          </div>

          {/* Campo de Código de Barras con Indicador de Estado del Lector */}
          <div
            onClick={() => {
              if (hasPhysicalBarcode) focusBarcodeInput();
            }}
            className={`p-3.5 rounded-xl border transition-all duration-200 ${
              isInputFocused && hasPhysicalBarcode
                ? 'bg-blue-50/40 border-blue-400 ring-2 ring-blue-100'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex justify-between items-center mb-1.5">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wide">
                <span>Código de Barras</span>
                {hasPhysicalBarcode && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      isInputFocused
                        ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    <span>{isInputFocused ? '● Lector USB Listo' : '⚠ Clic aquí para enfocar'}</span>
                  </span>
                )}
              </label>

              {!hasPhysicalBarcode && (
                <button
                  type="button"
                  onClick={handleGenerateBarcode}
                  className="text-xs text-blue-600 hover:underline cursor-pointer"
                >
                  ↻ Regenerar código único
                </button>
              )}
            </div>

            <div className="relative">
              <input
                ref={barcodeInputRef}
                type="text"
                autoFocus
                tabIndex={1}
                value={barcode}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => {
                  setIsInputFocused(false);
                  if (barcode.trim()) {
                    checkBarcodeAvailability(barcode);
                  }
                }}
                onChange={(e) => {
                  setBarcode(e.target.value);
                  setIsValidCode(null);
                  setValidationMsg(null);
                }}
                onKeyDown={handleBarcodeKeyDown}
                placeholder={
                  hasPhysicalBarcode
                    ? 'Dispare el lector aquí (o escriba y presione Enter)...'
                    : 'Código autogenerado...'
                }
                disabled={!hasPhysicalBarcode || saving}
                className={`w-full px-4 py-3 rounded-lg border text-sm font-mono transition-all duration-150 focus:outline-hidden ${
                  isValidCode === true
                    ? 'border-green-500 ring-2 ring-green-100 bg-green-50/20 text-green-900 font-bold'
                    : isValidCode === false
                    ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20 text-red-900'
                    : 'border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 bg-white'
                }`}
              />

              {validating && (
                <div className="absolute right-3 top-3.5 text-xs text-blue-600 font-medium animate-pulse">
                  Verificando...
                </div>
              )}
            </div>

            {/* Mensaje de validación rápida */}
            {validationMsg && (
              <p
                className={`text-xs mt-2 font-medium ${
                  isValidCode === true ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {isValidCode === true ? '✓ ' : '✕ '}
                {validationMsg}
              </p>
            )}
          </div>

          {/* Opción avanzada de serial físico independiente */}
          <div>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowAdvancedSerial(!showAdvancedSerial)}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 cursor-pointer"
            >
              <span>{showAdvancedSerial ? '▼' : '▶'}</span>
              <span>
                {showAdvancedSerial
                  ? 'Ocultar número de serie de fábrica'
                  : '¿El chasis tiene un grabado de serie de fábrica diferente? (Opcional)'}
              </span>
            </button>

            {showAdvancedSerial && (
              <div className="mt-2 pl-4 border-l-2 border-gray-200">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Número de Serie Grabado de Fábrica
                </label>
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="Por defecto se igualará al código de barras..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>
            )}
          </div>

          {/* Fila de Propiedades Físicas: Color, Clip, Condición */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Color del Chasis
              </label>
              <select
                value={holderColor}
                onChange={(e) => setHolderColor(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white"
              >
                <option value="azul">Azul (Cuerpo Entero)</option>
                <option value="rojo">Rojo (Control / Viajero)</option>
                <option value="amarillo">Amarillo (Calibración)</option>
                <option value="verde">Verde (Área)</option>
                <option value="naranja">Naranja (Extremidades)</option>
                <option value="blanco">Blanco (Especial)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tipo de Sujeción / Clip
              </label>
              <select
                value={clipType}
                onChange={(e) => setClipType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white"
              >
                <option value="pinza_cocodrilo">Pinza Cocodrilo</option>
                <option value="clip_cinturon">Clip de Cinturón</option>
                <option value="cordon_cuello">Cordón para Cuello</option>
                <option value="sin_clip">Sin Clip / Base fija</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Condición Física Inicial
              </label>
              <select
                value={currentCondition}
                onChange={(e) => setCurrentCondition(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white"
              >
                <option value="integro">Íntegro (Óptimo)</option>
                <option value="danado_leve">Dañado Leve</option>
                <option value="danado_grave">Dañado Grave</option>
                <option value="sello_roto">Sello Roto</option>
              </select>
            </div>
          </div>

          {/* Modelo y Ubicación en Laboratorio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Modelo de Chasis (Opcional)
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Ej. UD-802, Harshaw TLD-100..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Ubicación Física en Lab (Opcional)
              </label>
              <input
                type="text"
                value={storageLocation}
                onChange={(e) => setStorageLocation(e.target.value)}
                placeholder="Ej. Bandeja A-01, Estante 2..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Observaciones / Notas Técnicas
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Notas opcionales sobre mantenimiento o procedencia..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-300 cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving || isValidCode === false}
              className={`px-5 py-2 text-xs font-semibold text-white rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 ${
                isValidCode === false
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {saving ? 'Guardando...' : 'Guardar Portadosímetro'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Ventana emergente ante código existente (Colisión de escaneo) */}
      {collidedHolder && (
        <HolderCollisionAlertModal
          holder={collidedHolder}
          onClose={handleCloseCollisionModal}
          onViewDetails={onViewDetails}
        />
      )}
    </>
  );
}
