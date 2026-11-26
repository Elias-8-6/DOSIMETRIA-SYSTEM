import { useEffect, useRef } from 'react';
import type { ValidatedDosimeterInfo } from '../../api/dosimeters.api';

interface DosimeterCollisionAlertModalProps {
  dosimeter: ValidatedDosimeterInfo;
  onClose: () => void;
  onViewDetails?: (dosimeterId: string) => void;
}

export function DosimeterCollisionAlertModal({
  dosimeter,
  onClose,
  onViewDetails,
}: DosimeterCollisionAlertModalProps) {
  const dismissBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    dismissBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const conditionLabels: Record<string, string> = {
    normal: 'Normal / Íntegro',
    danado: 'Dañado',
    contaminado: 'Contaminado',
    perdido: 'Perdido',
  };

  const statusColors: Record<string, string> = {
    DISPONIBLE: 'bg-green-100 text-green-800 border-green-300',
    ASIGNADO: 'bg-blue-100 text-blue-800 border-blue-300',
    EN_TRANSITO: 'bg-purple-100 text-purple-800 border-purple-300',
    CALIBRACION: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    PROCESADO: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    BAJA: 'bg-red-100 text-red-800 border-red-300',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-amber-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabecera con advertencia */}
        <div className="bg-amber-50 px-6 py-4 border-b border-amber-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-xl font-bold shrink-0">
            ⚠️
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Dosímetro ya registrado
            </h3>
            <p className="text-xs text-amber-700">
              El código escaneado ya pertenece a un dosímetro en el inventario
            </p>
          </div>
        </div>

        {/* Cuerpo con datos del dosímetro existente */}
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">
              Código de Barras Escaneado
            </span>
            <span className="font-mono text-xl font-bold text-gray-900 bg-white px-3 py-1 rounded border border-gray-300 inline-block">
              {dosimeter.barcode}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 bg-gray-50 rounded border border-gray-100">
              <span className="text-gray-400 block mb-0.5">N° de Serie / Int.</span>
              <span className="font-medium text-gray-900 block truncate">
                {dosimeter.serial_number}
                {dosimeter.internal_code ? ` (${dosimeter.internal_code})` : ''}
              </span>
            </div>

            <div className="p-2.5 bg-gray-50 rounded border border-gray-100">
              <span className="text-gray-400 block mb-0.5">Estado operativo</span>
              <span
                className={`inline-block px-2 py-0.5 rounded font-semibold text-[11px] border ${
                  statusColors[dosimeter.status_code || ''] || 'bg-gray-100 text-gray-800 border-gray-300'
                }`}
              >
                {dosimeter.status_name || dosimeter.status_code || 'Desconocido'}
              </span>
            </div>

            <div className="p-2.5 bg-gray-50 rounded border border-gray-100">
              <span className="text-gray-400 block mb-0.5">Tipo / Modelo</span>
              <span className="font-medium text-gray-800 truncate block">
                {dosimeter.dosimeter_type_name || 'TLD'} {dosimeter.model ? `• ${dosimeter.model}` : ''}
              </span>
            </div>

            <div className="p-2.5 bg-gray-50 rounded border border-gray-100">
              <span className="text-gray-400 block mb-0.5">Condición física</span>
              <span className="font-medium text-gray-800">
                {conditionLabels[dosimeter.current_condition] || dosimeter.current_condition}
              </span>
            </div>
          </div>

          {/* Estado de Ensamble y Asignación */}
          {dosimeter.active_holder && (
            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-lg text-xs">
              <span className="text-blue-900 font-semibold block mb-0.5">
                🛡️ Portadosímetro Acoplado
              </span>
              <p className="text-blue-700">
                Barcode: <strong className="font-mono">{dosimeter.active_holder.barcode}</strong> (S/N {dosimeter.active_holder.serial_number}, {dosimeter.active_holder.holder_color || 'Azul'})
              </p>
            </div>
          )}

          {dosimeter.active_assignment && (
            <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-lg text-xs">
              <span className="text-purple-900 font-semibold block mb-0.5">
                👤 Asignación Activa en Campo
              </span>
              <p className="text-purple-700">
                Trabajador: <strong>{dosimeter.active_assignment.worker_name || 'Asignado'}</strong>
                {dosimeter.active_assignment.client_name ? ` • ${dosimeter.active_assignment.client_name}` : ''}
              </p>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="bg-gray-50 px-6 py-3.5 border-t border-gray-200 flex items-center justify-between gap-3">
          {onViewDetails ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onViewDetails(dosimeter.id);
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
            >
              Ver Ficha Completa →
            </button>
          ) : (
            <span />
          )}

          <button
            ref={dismissBtnRef}
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          >
            Entendido / Escanear Siguiente (Enter)
          </button>
        </div>
      </div>
    </div>
  );
}
