import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  PendingOrderForReception,
  PackagingCondition,
  ReceptionItemCondition,
  CreateReceptionItemPayload,
} from '../../api/receptions.api';
import {
  getPendingOrdersForReception,
  createReception,
  uploadReceptionPhoto,
} from '../../api/receptions.api';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { PACKAGING_CONDITION_LABELS, RECEPTION_ITEM_CONDITION_LABELS } from '../../constants/receptions';
import { useToast } from '../../hooks/useToast';
import { formatImageUrl } from '../../utils/imageUrl';

interface LocalDosimeterInspection extends CreateReceptionItemPayload {
  included: boolean;
  serial_number: string;
  internal_code: string | null;
  technology?: string;
  dosimeter_photo_url?: string | null;
  uploadingPhoto?: boolean;
}

export default function CreateReceptionPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [pendingOrders, setPendingOrders] = useState<PendingOrderForReception[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<PendingOrderForReception | null>(null);

  const [packagingCondition, setPackagingCondition] = useState<PackagingCondition>('integro');
  const [observations, setObservations] = useState('');
  const [inspections, setInspections] = useState<LocalDosimeterInspection[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [activePhotoModal, setActivePhotoModal] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    async function loadOrders() {
      setLoadingOrders(true);
      try {
        const orders = await getPendingOrdersForReception();
        setPendingOrders((orders || []).filter((o) => o.status === 'PENDING'));
      } catch {
        showToast('No se pudieron cargar las órdenes de servicio pendientes', 'error');
      } finally {
        setLoadingOrders(false);
      }
    }
    loadOrders();
  }, [showToast]);

  const handleOrderChange = (orderId: string) => {
    setSelectedOrderId(orderId);
    const order = pendingOrders.find((o) => o.id === orderId) || null;
    setSelectedOrder(order);

    if (order) {
      const items: LocalDosimeterInspection[] = order.service_order_items.map((soItem) => ({
        included: true,
        dosimeter_id: soItem.dosimeter_id,
        serial_number: soItem.dosimeters.serial_number,
        internal_code: soItem.dosimeters.internal_code,
        technology: soItem.dosimeters.dosimeter_types?.technology ?? 'TLD',
        dosimeter_photo_url: soItem.dosimeters.photo_url || null,
        received_condition: 'normal',
        sealed: true,
        contaminated: false,
        observations: '',
        condition_photo_url: '',
      }));
      setInspections(items);
    } else {
      setInspections([]);
    }
  };

  const updateItem = (index: number, updates: Partial<LocalDosimeterInspection>) => {
    setInspections((prev) => {
      const next = [...prev];
      const item = { ...next[index], ...updates };

      // Reglas de conveniencia automáticas:
      if (updates.received_condition === 'contaminado') {
        item.contaminated = true;
      }
      if (updates.received_condition === 'sello_roto') {
        item.sealed = false;
      }
      if (updates.received_condition === 'normal') {
        if (updates.contaminated === undefined) item.contaminated = false;
        if (updates.sealed === undefined) item.sealed = true;
      }

      next[index] = item;
      return next;
    });
  };

  const handlePhotoUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    updateItem(index, { uploadingPhoto: true });
    try {
      const { url } = await uploadReceptionPhoto(file);
      updateItem(index, { condition_photo_url: url, uploadingPhoto: false });
      showToast('Evidencia fotográfica cargada correctamente', 'success');
    } catch {
      updateItem(index, { uploadingPhoto: false });
      showToast(
        'No se pudo subir la fotografía. Asegúrese de que sea formato de imagen (JPG, PNG) menor a 5MB.',
        'error',
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) {
      showToast('Debe seleccionar una orden de servicio', 'error');
      return;
    }

    const selectedItems = inspections.filter((i) => i.included);
    if (selectedItems.length === 0) {
      showToast('Debe seleccionar al menos un dosímetro a recepcionar', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        service_order_id: selectedOrderId,
        packaging_condition: packagingCondition,
        observations: observations.trim() || undefined,
        items: selectedItems.map((item) => ({
          dosimeter_id: item.dosimeter_id,
          received_condition: item.received_condition,
          sealed: item.sealed ?? true,
          contaminated: item.contaminated ?? false,
          observations: item.observations?.trim() || undefined,
          condition_photo_url: item.condition_photo_url || undefined,
        })),
      };

      const result = await createReception(payload);
      showToast(`Recepción ${result.reception_code} registrada exitosamente`, 'success');
      navigate(`/receptions/${result.id}`);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al registrar la recepción';
      showToast(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Nueva Recepción Física en Laboratorio"
        subtitle="Verificación de paquetes entrantes e inspección individual de dosímetros (ISO 17025)"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Paso 1: Selección de Orden de Servicio */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
              1
            </span>
            Orden de Servicio a Recepcionar
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seleccione la orden pendiente *
              </label>
              <select
                value={selectedOrderId}
                onChange={(e) => handleOrderChange(e.target.value)}
                disabled={loadingOrders}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                required
              >
                <option value="">
                  {loadingOrders
                    ? 'Cargando órdenes...'
                    : pendingOrders.length === 0
                    ? '-- No hay órdenes pendientes de recepción --'
                    : '-- Seleccione una orden de servicio pendiente --'}
                </option>
                {pendingOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.order_number} — {order.clients?.name} ({order.service_order_items.length} dosímetros)
                  </option>
                ))}
              </select>
              {!loadingOrders && pendingOrders.length === 0 && (
                <p className="mt-1.5 text-xs text-amber-700">
                  No hay órdenes de servicio en estado <strong>PENDIENTE</strong>. Solo las órdenes pendientes pueden ser recepcionadas.
                </p>
              )}
            </div>

            {selectedOrder && (
              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-sm flex flex-col justify-center">
                <div className="flex justify-between items-center text-gray-700 mb-1">
                  <span className="text-xs text-gray-500">Cliente:</span>
                  <span className="font-semibold text-gray-900">{selectedOrder.clients?.name}</span>
                </div>
                <div className="flex justify-between items-center text-gray-700 mb-1">
                  <span className="text-xs text-gray-500">Tipo de Servicio:</span>
                  <span className="capitalize">{selectedOrder.service_type.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between items-center text-gray-700">
                  <span className="text-xs text-gray-500">Dosímetros esperados:</span>
                  <span className="font-bold text-blue-700">{selectedOrder.service_order_items.length}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Paso 2: Evaluación del Bulto / Paquete Exterior */}
        {selectedOrder && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                2
              </span>
              Estado del Paquete / Envoltorio Exterior
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Condición del embalaje recibido *
                </label>
                <div className="flex gap-4">
                  {(['integro', 'danado_leve', 'danado_grave'] as PackagingCondition[]).map((cond) => (
                    <label
                      key={cond}
                      className={`flex-1 flex flex-col items-center p-3 border rounded-xl cursor-pointer transition-all ${
                        packagingCondition === cond
                          ? 'border-blue-500 bg-blue-50/40 text-blue-800 font-medium'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="packaging_condition"
                        value={cond}
                        checked={packagingCondition === cond}
                        onChange={() => setPackagingCondition(cond)}
                        className="sr-only"
                      />
                      <span className="text-sm">{PACKAGING_CONDITION_LABELS[cond]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones generales del paquete
                </label>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Detalles sobre número de guía, transportadora, estado del precinto..."
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Paso 3: Inspección Individual de Dosímetros */}
        {selectedOrder && inspections.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                  3
                </span>
                Inspección Individual de Dosímetros
              </h2>
              <span className="text-xs text-gray-500">
                {inspections.filter((i) => i.included).length} de {inspections.length} seleccionados
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Incluir</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Dosímetro</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Condición Física</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Sello Íntegro</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Contaminado</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Foto Evidencia</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {inspections.map((item, idx) => {
                    const willTriggerIncident =
                      item.contaminated ||
                      item.sealed === false ||
                      ['danado_fisico', 'sello_roto', 'contaminado', 'perdido'].includes(item.received_condition);

                    return (
                      <tr
                        key={item.dosimeter_id}
                        className={`transition-colors ${
                          !item.included
                            ? 'opacity-40 bg-gray-50'
                            : willTriggerIncident
                            ? 'bg-rose-50/40 hover:bg-rose-50/60'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        {/* Checkbox incluir */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={item.included}
                            onChange={(e) => updateItem(idx, { included: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>

                        {/* Identificación del dosímetro con fotografía */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            {item.dosimeter_photo_url ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setActivePhotoModal({
                                    url: formatImageUrl(item.dosimeter_photo_url),
                                    title: `Dosímetro ${item.serial_number} — Fotografía Registrada`,
                                  })
                                }
                                className="w-10 h-10 shrink-0 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 hover:border-blue-500 cursor-pointer transition-all shadow-xs"
                                title="Ver fotografía registrada del dosímetro"
                              >
                                <img
                                  src={formatImageUrl(item.dosimeter_photo_url)}
                                  alt={item.serial_number}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ) : (
                              <div className="w-10 h-10 shrink-0 rounded-lg border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-[9px] text-gray-400">
                                Sin foto
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-gray-900">{item.serial_number}</div>
                              <div className="text-xs text-gray-500">
                                {item.internal_code || 'Sin código int.'} • {item.technology}
                              </div>
                              {willTriggerIncident && item.included && (
                                <span className="inline-block mt-1 text-[11px] font-semibold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                                  ⚠ Disparará Incidente
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Condición */}
                        <td className="px-3 py-3">
                          <select
                            disabled={!item.included}
                            value={item.received_condition}
                            onChange={(e) =>
                              updateItem(idx, {
                                received_condition: e.target.value as ReceptionItemCondition,
                              })
                            }
                            className="border border-gray-300 rounded-md px-2 py-1 text-xs bg-white focus:ring-2 focus:ring-blue-500"
                          >
                            {(Object.keys(RECEPTION_ITEM_CONDITION_LABELS) as ReceptionItemCondition[]).map((cond) => (
                              <option key={cond} value={cond}>
                                {RECEPTION_ITEM_CONDITION_LABELS[cond]}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Sello intacto */}
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            disabled={!item.included}
                            checked={item.sealed ?? true}
                            onChange={(e) => updateItem(idx, { sealed: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>

                        {/* Contaminado */}
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            disabled={!item.included}
                            checked={item.contaminated ?? false}
                            onChange={(e) => updateItem(idx, { contaminated: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                          />
                        </td>

                        {/* Foto de evidencia */}
                        <td className="px-3 py-3">
                          {item.condition_photo_url ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setActivePhotoModal({
                                    url: formatImageUrl(item.condition_photo_url),
                                    title: `Evidencia de Recepción — Dosímetro ${item.serial_number}`,
                                  })
                                }
                                className="w-10 h-10 shrink-0 rounded-lg border border-gray-200 overflow-hidden hover:border-blue-500 cursor-pointer transition-all shadow-xs"
                                title="Ampliar fotografía de evidencia"
                              >
                                <img
                                  src={formatImageUrl(item.condition_photo_url)}
                                  alt="Evidencia"
                                  className="w-full h-full object-cover"
                                />
                              </button>
                              <button
                                type="button"
                                onClick={() => updateItem(idx, { condition_photo_url: '' })}
                                className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded border border-red-200 hover:bg-red-50 cursor-pointer"
                                title="Quitar fotografía"
                              >
                                Quitar
                              </button>
                            </div>
                          ) : (
                            <label className={`inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 cursor-pointer hover:bg-gray-50 shadow-xs transition-colors ${!item.included || item.uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}>
                              {item.uploadingPhoto ? 'Subiendo...' : '📷 + Evidencia'}
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="sr-only"
                                onChange={(e) => handlePhotoUpload(idx, e)}
                              />
                            </label>
                          )}
                        </td>

                        {/* Observaciones individuales */}
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            disabled={!item.included}
                            value={item.observations || ''}
                            onChange={(e) => updateItem(idx, { observations: e.target.value })}
                            placeholder="Notas del estado..."
                            className="border border-gray-300 rounded px-2 py-1 text-xs w-full focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/receptions')}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={submitting || !selectedOrderId || inspections.filter((i) => i.included).length === 0}
          >
            {submitting ? 'Registrando recepción...' : 'Guardar y Confirmar Recepción'}
          </Button>
        </div>
      </form>

      {/* Modal para visualizar foto en tamaño completo */}
      {activePhotoModal && (
        <Modal
          onClose={() => setActivePhotoModal(null)}
          title={activePhotoModal.title}
        >
          <div className="p-4 flex flex-col items-center">
            <img
              src={activePhotoModal.url}
              alt="Fotografía completa"
              className="max-h-[70vh] rounded-lg object-contain border border-gray-200 shadow-md"
            />
            <div className="mt-4 flex justify-between items-center w-full">
              <a
                href={activePhotoModal.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                Abrir en pestaña nueva ↗
              </a>
              <Button variant="secondary" onClick={() => setActivePhotoModal(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
