import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import {
  updateHolder,
  deleteHolder,
  type HolderDosimeter,
  type UpdateHolderPayload,
} from '../../api/dosimeters.api';

interface EditHolderModalProps {
  holder: HolderDosimeter;
  onClose: () => void;
  onSuccess: (updated: HolderDosimeter) => void;
}

export function EditHolderModal({
  holder,
  onClose,
  onSuccess,
}: EditHolderModalProps) {
  const [currentCondition, setCurrentCondition] = useState(holder.current_condition || 'integro');
  const [status, setStatus] = useState(holder.status || 'disponible');
  const [holderColor, setHolderColor] = useState(holder.holder_color || 'azul');
  const [clipType, setClipType] = useState(holder.clip_type || 'pinza_cocodrilo');
  const [model, setModel] = useState(holder.model || '');
  const [storageLocation, setStorageLocation] = useState(holder.storage_location || '');
  const [notes, setNotes] = useState(holder.notes || '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const payload: UpdateHolderPayload = {
        current_condition: currentCondition,
        status,
        holder_color: holderColor,
        clip_type: clipType,
        model: model.trim() || undefined,
        storage_location: storageLocation.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const updated = await updateHolder(holder.id, payload);
      onSuccess(updated);
      onClose();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      setError(apiErr?.response?.data?.message || 'Error al actualizar el portadosímetro.');
    } finally {
      setSaving(false);
    }
  };

  const handleDecommission = async () => {
    const confirm = window.confirm(
      `¿Está seguro de dar de baja el portadosímetro '${holder.barcode}'? Esta acción registrará el retiro en auditoría.`,
    );
    if (!confirm) return;

    try {
      setSaving(true);
      setError(null);
      const res = await deleteHolder(holder.id);
      onSuccess(res.holder);
      onClose();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      setError(apiErr?.response?.data?.message || 'Error al dar de baja el portadosímetro.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Editar Portadosímetro: ${holder.barcode}`}
      onClose={onClose}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs rounded">
            {error}
          </div>
        )}

        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex justify-between items-center text-xs">
          <div>
            <span className="text-gray-400 block">Código de Barras</span>
            <span className="font-mono font-bold text-gray-900 text-sm">
              {holder.barcode}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block">Número de Serie</span>
            <span className="font-mono text-gray-800">{holder.serial_number}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Condición Física
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
              <option value="contaminado">Contaminado</option>
              <option value="perdido">Perdido</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Estado Operativo
            </label>
            <select
              value={status}
              disabled={holder.status === 'en_campo'}
              onChange={(e) => setStatus(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-xs ${
                holder.status === 'en_campo'
                  ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed'
                  : 'bg-white border-gray-300'
              }`}
            >
              <option value="disponible" disabled={!!holder.active_assembly}>
                Disponible {holder.active_assembly ? '(Bloqueado por ensamble activo)' : ''}
              </option>
              <option value="ensamblado">Ensamblado</option>
              <option value="en_campo" disabled>En Campo (Solo por asignación)</option>
              <option value="en_triaje">En Triaje</option>
              <option value="danado">Dañado / En Mantenimiento</option>
              <option value="baja" disabled={!!holder.active_assembly}>
                Dado de Baja {holder.active_assembly ? '(Requiere desensamble previo)' : ''}
              </option>
            </select>
            {holder.status === 'en_campo' && (
              <span className="text-[10px] text-amber-600 block mt-1">
                En campo: estado bloqueado hasta registrar devolución.
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Color del Chasis
            </label>
            <input
              type="text"
              value={holderColor}
              onChange={(e) => setHolderColor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Tipo de Clip
            </label>
            <input
              type="text"
              value={clipType}
              onChange={(e) => setClipType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Modelo
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Ej. UD-802"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Ubicación Física
            </label>
            <input
              type="text"
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              placeholder="Ej. Bandeja A-01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Notas Técnicas / Mantenimiento
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
          />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <button
            type="button"
            onClick={handleDecommission}
            disabled={saving || holder.status === 'baja'}
            className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg border border-red-200 cursor-pointer disabled:opacity-50"
          >
            Dar de Baja (Retirar)
          </button>

          <div className="flex gap-2">
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
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
