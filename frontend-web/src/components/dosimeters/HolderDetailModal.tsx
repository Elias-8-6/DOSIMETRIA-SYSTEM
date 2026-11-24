import { useEffect, useState, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import {
  getHolderById,
  type HolderDosimeter,
  type HolderAssemblyRecord,
} from '../../api/dosimeters.api';

interface HolderDetailModalProps {
  holderId: string;
  onClose: () => void;
  onEdit?: (holder: HolderDosimeter) => void;
}

export function HolderDetailModal({
  holderId,
  onClose,
  onEdit,
}: HolderDetailModalProps) {
  const [holder, setHolder] = useState<HolderDosimeter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getHolderById(holderId);
      setHolder(data);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      setError(apiErr?.response?.data?.message || 'Error al cargar detalle del portadosímetro.');
    } finally {
      setLoading(false);
    }
  }, [holderId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const statusColors: Record<string, string> = {
    disponible: 'bg-green-100 text-green-800 border-green-300',
    ensamblado: 'bg-blue-100 text-blue-800 border-blue-300',
    en_campo: 'bg-purple-100 text-purple-800 border-purple-300',
    en_triaje: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    danado: 'bg-red-100 text-red-800 border-red-300',
    baja: 'bg-gray-100 text-gray-800 border-gray-300',
  };

  return (
    <Modal
      title="Ficha Técnica de Portadosímetro"
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      <div className="p-6 space-y-5">
        {loading && (
          <div className="py-12 text-center text-xs text-gray-400">
            Cargando información del portadosímetro...
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs rounded">
            {error}
          </div>
        )}

        {!loading && holder && (
          <>
            {/* Cabecera Principal */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Código de Barras Exterior
                </span>
                <span className="font-mono text-2xl font-bold text-gray-900">
                  {holder.barcode}
                </span>
                <span className="text-xs text-gray-500 block mt-0.5">
                  Número de serie: <span className="font-mono font-medium text-gray-700">{holder.serial_number}</span>
                </span>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    statusColors[holder.status] || 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {holder.status.toUpperCase()}
                </span>
                <span className="text-xs text-gray-500 capitalize">
                  Condición: <strong>{holder.current_condition.replace('_', ' ')}</strong>
                </span>
              </div>
            </div>

            {/* Ensamble Activo */}
            <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-4">
              <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>🔗</span>
                <span>Ensamble Actual con Tarjeta TLD</span>
              </h4>

              {holder.active_assembly?.dosimeter ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white p-3 rounded-lg border border-blue-100">
                  <div>
                    <span className="text-gray-400 block mb-0.5">Dosímetro S/N</span>
                    <span className="font-mono font-bold text-blue-700 text-sm">
                      {holder.active_assembly.dosimeter.serial_number}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">Modelo / Condición</span>
                    <span className="font-medium text-gray-800">
                      {holder.active_assembly.dosimeter.model || 'TLD'} ({holder.active_assembly.dosimeter.current_condition || 'Operativo'})
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">Fecha de Ensamblaje</span>
                    <span className="font-medium text-gray-800">
                      {new Date(holder.active_assembly.assembled_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ) : holder.active_assembly?.tld_card ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white p-3 rounded-lg border border-indigo-100">
                  <div>
                    <span className="text-gray-400 block mb-0.5">Tarjeta TLD S/N</span>
                    <span className="font-mono font-bold text-indigo-700 text-sm">
                      {holder.active_assembly.tld_card.serial_number}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">Elementos Sensibles</span>
                    <span className="font-medium text-gray-800">
                      {holder.active_assembly.tld_card.elements_count} pastillas
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">Fecha de Ensamblaje</span>
                    <span className="font-medium text-gray-800">
                      {new Date(holder.active_assembly.assembled_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-3 rounded-lg border border-gray-200 text-xs text-gray-500 text-center py-4">
                  El chasis no tiene ningún dosímetro ni tarjeta TLD montada en este momento (Disponible para ensamblar).
                </div>
              )}
            </div>

            {/* Datos Físicos y Ubicación */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-gray-400 block mb-0.5">Color</span>
                <span className="font-medium text-gray-800 capitalize">
                  {holder.holder_color || 'Azul'}
                </span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-gray-400 block mb-0.5">Clip / Sujeción</span>
                <span className="font-medium text-gray-800 capitalize">
                  {(holder.clip_type || 'pinza_cocodrilo').replace('_', ' ')}
                </span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-gray-400 block mb-0.5">Modelo</span>
                <span className="font-medium text-gray-800">
                  {holder.model || 'Genérico'}
                </span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-gray-400 block mb-0.5">Ubicación Física</span>
                <span className="font-medium text-gray-800 truncate block">
                  {holder.storage_location || 'No asignada'}
                </span>
              </div>
            </div>

            {/* Observaciones */}
            {holder.notes && (
              <div className="text-xs bg-gray-50 p-3 rounded-lg border border-gray-200">
                <span className="font-semibold text-gray-700 block mb-1">Notas:</span>
                <p className="text-gray-600">{holder.notes}</p>
              </div>
            )}

            {/* Historial de Ensambles */}
            {holder.assembly_history && holder.assembly_history.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Historial de Montajes y Desmontajes ({holder.assembly_history.length})
                </h4>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 text-xs">
                  {holder.assembly_history.map((asm: HolderAssemblyRecord) => (
                    <div key={asm.id} className="p-2.5 flex justify-between items-center hover:bg-gray-50">
                      <div>
                        <span className="font-mono font-medium text-gray-800">
                          {asm.dosimeters?.serial_number
                            ? `Dosímetro: ${asm.dosimeters.serial_number}`
                            : asm.tld_cards?.serial_number
                            ? `TLD: ${asm.tld_cards.serial_number}`
                            : 'Ensamble Físico'}
                        </span>
                        <span className="text-gray-400 text-[11px] block">
                          Montado: {new Date(asm.assembled_at).toLocaleDateString()}
                          {asm.disassembled_at && ` • Desmontado: ${new Date(asm.disassembled_at).toLocaleDateString()}`}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          asm.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {asm.is_active ? 'ACTIVO' : 'HISTÓRICO'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pie con botón de editar */}
            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
              <span className="text-[11px] text-gray-400">
                Registrado el {holder.created_at ? new Date(holder.created_at).toLocaleDateString() : 'N/A'}
              </span>

              <div className="flex gap-2">
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onEdit(holder);
                    }}
                    className="px-4 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg cursor-pointer"
                  >
                    Editar Portadosímetro
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 border border-gray-300 rounded-lg cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
