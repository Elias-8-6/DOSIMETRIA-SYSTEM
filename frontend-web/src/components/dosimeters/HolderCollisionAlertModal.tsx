import { useEffect, useRef } from 'react';
import type { HolderDosimeter } from '../../api/dosimeters.api';

interface HolderCollisionAlertModalProps {
  holder: HolderDosimeter;
  onClose: () => void;
  onViewDetails?: (holder: HolderDosimeter) => void;
}

export function HolderCollisionAlertModal({
  holder,
  onClose,
  onViewDetails,
}: HolderCollisionAlertModalProps) {
  const dismissBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Foco automático en el botón principal para permitir cerrar con Enter/Space
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
    integro: 'Íntegro',
    danado_leve: 'Dañado leve',
    danado_grave: 'Dañado grave',
    sello_roto: 'Sello roto',
    contaminado: 'Contaminado',
    perdido: 'Perdido',
  };

  const statusLabels: Record<string, string> = {
    disponible: 'Disponible',
    ensamblado: 'Ensamblado',
    en_campo: 'En campo',
    en_triaje: 'En triaje',
    danado: 'Dañado',
    baja: 'Dado de baja',
  };

  const statusColors: Record<string, string> = {
    disponible: 'bg-green-100 text-green-800 border-green-300',
    ensamblado: 'bg-blue-100 text-blue-800 border-blue-300',
    en_campo: 'bg-purple-100 text-purple-800 border-purple-300',
    en_triaje: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    danado: 'bg-red-100 text-red-800 border-red-300',
    baja: 'bg-gray-100 text-gray-800 border-gray-300',
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
              Portadosímetro ya registrado
            </h3>
            <p className="text-xs text-amber-700">
              El código escaneado ya existe en la base de datos
            </p>
          </div>
        </div>

        {/* Cuerpo con datos del portadosímetro existente */}
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">
              Código de Barras Escaneado
            </span>
            <span className="font-mono text-xl font-bold text-gray-900 bg-white px-3 py-1 rounded border border-gray-300 inline-block">
              {holder.barcode}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 bg-gray-50 rounded border border-gray-100">
              <span className="text-gray-400 block mb-0.5">Estado operativo</span>
              <span
                className={`inline-block px-2 py-0.5 rounded font-semibold text-[11px] border ${
                  statusColors[holder.status] || 'bg-gray-100 text-gray-800'
                }`}
              >
                {statusLabels[holder.status] || holder.status}
              </span>
            </div>

            <div className="p-2.5 bg-gray-50 rounded border border-gray-100">
              <span className="text-gray-400 block mb-0.5">Condición física</span>
              <span className="font-medium text-gray-800">
                {conditionLabels[holder.current_condition] || holder.current_condition}
              </span>
            </div>

            <div className="p-2.5 bg-gray-50 rounded border border-gray-100">
              <span className="text-gray-400 block mb-0.5">Color / Clip</span>
              <span className="font-medium text-gray-800 capitalize">
                {holder.holder_color || 'Azul'} • {holder.clip_type || 'Pinza'}
              </span>
            </div>

            <div className="p-2.5 bg-gray-50 rounded border border-gray-100">
              <span className="text-gray-400 block mb-0.5">Ubicación</span>
              <span className="font-medium text-gray-800 truncate block">
                {holder.storage_location || 'No especificada'}
              </span>
            </div>
          </div>

          {/* Estado de Ensamble */}
          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-lg text-xs">
            <span className="text-blue-900 font-semibold block mb-1">
              {holder.active_assembly?.dosimeter
                ? '🛡️ Dosímetro Actualmente Acoplado'
                : holder.active_assembly?.tld_card
                ? '🔗 Tarjeta TLD Actualmente Acoplada'
                : '⚪ Sin Ensamble Activo (Chasis Libre)'}
            </span>
            {holder.active_assembly?.dosimeter ? (
              <p className="text-blue-700">
                Dosímetro <strong>S/N {holder.active_assembly.dosimeter.serial_number}</strong> (
                {holder.active_assembly.dosimeter.model || 'TLD'})
              </p>
            ) : holder.active_assembly?.tld_card ? (
              <p className="text-blue-700">
                Tarjeta <strong>S/N {holder.active_assembly.tld_card.serial_number}</strong> (
                {holder.active_assembly.tld_card.elements_count || 2} elementos dosimétricos)
              </p>
            ) : (
              <p className="text-gray-500">
                El chasis se encuentra disponible para ensamblar.
              </p>
            )}
          </div>
        </div>

        {/* Botones de acción */}
        <div className="bg-gray-50 px-6 py-3.5 border-t border-gray-200 flex items-center justify-between gap-3">
          {onViewDetails ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onViewDetails(holder);
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
