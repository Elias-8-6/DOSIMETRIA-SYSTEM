import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type {
  ServiceOrderDetail,
  ServiceOrderStatus,
  ServiceType,
  Priority,
} from '../../api/serviceOrders.api';
import {
  getServiceOrder,
  updateServiceOrderStatus,
  cancelServiceOrder,
  removeServiceOrderItem,
} from '../../api/serviceOrders.api';
import { EditServiceOrderModal } from '../../components/service-orders/EditServiceOrderModal';
import { AddItemModal } from '../../components/service-orders/AddItemModal';
import { ServiceOrderStatusControl } from '../../components/service-orders/ServiceOrderStatusControl';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { formatDate } from '../../utils/date';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  lectura_dosis: 'Lectura de dosis',
  lectura_y_recarga: 'Lectura y recarga',
  mantenimiento: 'Mantenimiento',
  calibracion: 'Calibración',
};

const STATUS_LABELS: Record<ServiceOrderStatus, string> = {
  PENDING: 'Pendiente',
  RECEIVED: 'Recibida',
  IN_PROCESS: 'En proceso',
  QC_REVIEW: 'Revisión QC',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

const STATUS_CLASSES: Record<ServiceOrderStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-600',
  RECEIVED: 'bg-blue-100 text-blue-700',
  IN_PROCESS: 'bg-amber-100 text-amber-700',
  QC_REVIEW: 'bg-violet-100 text-violet-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  normal: 'Normal',
  urgente: 'Urgente',
  critica: 'Crítica',
};

const REQUESTED_ACTION_LABELS: Record<string, string> = {
  lectura: 'Lectura',
  limpieza: 'Limpieza',
  recarga: 'Recarga',
  inspeccion: 'Inspección',
};

function OrderStatusBadge({ status }: { status: ServiceOrderStatus }) {
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export default function ServiceOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { showToast } = useToast();

  const [order, setOrder] = useState<ServiceOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  const [editModal, setEditModal] = useState(false);
  const [editKey, setEditKey] = useState(0);
  const [addItemModal, setAddItemModal] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const detail = await getServiceOrder(id);
      setOrder(detail);
    } catch {
      setError('No se pudo cargar la orden de servicio');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleTransition = async (next: Exclude<ServiceOrderStatus, 'CANCELLED'>) => {
    if (!order) return;
    setStatusLoading(true);
    try {
      await updateServiceOrderStatus(order.id, next);
      showToast('Estado actualizado correctamente');
      fetchOrder();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      showToast(e?.response?.data?.message ?? 'No se pudo actualizar el estado');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!order) return;
    setStatusLoading(true);
    try {
      await cancelServiceOrder(order.id);
      showToast('Orden cancelada correctamente');
      setCancelDialog(false);
      fetchOrder();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      showToast(e?.response?.data?.message ?? 'No se pudo cancelar la orden');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!order) return;
    setRemovingItemId(itemId);
    try {
      await removeServiceOrderItem(order.id, itemId);
      showToast('Dosímetro quitado de la orden');
      fetchOrder();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      showToast(e?.response?.data?.message ?? 'No se pudo quitar el dosímetro');
    } finally {
      setRemovingItemId(null);
    }
  };

  const sectionHead = (label: string) => (
    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{label}</h2>
  );

  const field = (label: string, value: string | null | undefined) =>
    value ? (
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-800 mt-0.5">{value}</p>
      </div>
    ) : null;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-20 text-gray-400 text-sm">
        Cargando...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">{error || 'Orden de servicio no encontrada'}</p>
        <button
          onClick={() => navigate('/service-orders')}
          className="mt-4 text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
        >
          ← Volver a órdenes de servicio
        </button>
      </div>
    );
  }

  const isPending = order.status === 'PENDING';
  const canEdit = hasPermission('service_orders', 'update') && !['COMPLETED', 'CANCELLED'].includes(order.status);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => navigate('/service-orders')}
            className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer mb-2 block"
          >
            ← Volver a órdenes de servicio
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{order.order_number}</h1>
            <OrderStatusBadge status={order.status} />
            <span className="text-sm text-gray-400">{PRIORITY_LABELS[order.priority]}</span>
          </div>
        </div>
        {canEdit && (
          <button
            onClick={() => {
              setEditKey((k) => k + 1);
              setEditModal(true);
            }}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 border bg-gray-100 border-gray-300 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
          >
            Editar
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          {sectionHead('Datos de la orden')}
          <div className="grid grid-cols-2 gap-y-4 gap-x-6">
            {field('Cliente', order.clients?.name)}
            {field('Tipo de servicio', SERVICE_TYPE_LABELS[order.service_type])}
            {field('Fecha solicitada', formatDate(order.requested_date))}
            {field('Fecha límite', formatDate(order.due_date))}
            {field('Creada', formatDate(order.created_at))}
          </div>
          {order.observations && (
            <div className="mt-4">
              <p className="text-xs text-gray-400">Observaciones</p>
              <p className="text-sm text-gray-800 mt-0.5">{order.observations}</p>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
          {sectionHead('Estado')}
          <ServiceOrderStatusControl
            status={order.status}
            canUpdate={hasPermission('service_orders', 'update')}
            canCancel={hasPermission('service_orders', 'delete')}
            loading={statusLoading}
            onTransition={handleTransition}
            onCancel={() => setCancelDialog(true)}
          />
          {['COMPLETED', 'CANCELLED'].includes(order.status) && (
            <p className="text-sm text-gray-400">Estado terminal, no admite más transiciones</p>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">
            Dosímetros solicitados
            <span className="ml-2 text-xs font-normal text-gray-400">
              ({order.service_order_items.length})
            </span>
          </h2>
          {isPending && hasPermission('service_orders', 'update') && (
            <Button onClick={() => setAddItemModal(true)}>Agregar dosímetro</Button>
          )}
        </div>

        {order.service_order_items.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center">Sin dosímetros en esta orden</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {order.service_order_items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {item.dosimeters.serial_number}
                    {item.dosimeters.internal_code && (
                      <span className="text-gray-400 font-normal"> ({item.dosimeters.internal_code})</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">
                    {REQUESTED_ACTION_LABELS[item.requested_action] ?? item.requested_action} · {item.status}
                  </p>
                </div>
                {isPending && hasPermission('service_orders', 'update') && (
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={removingItemId === item.id}
                    className="text-red-600 hover:text-red-700 cursor-pointer text-xs disabled:opacity-50"
                  >
                    {removingItemId === item.id ? 'Quitando...' : 'Quitar'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {editModal && (
        <EditServiceOrderModal
          key={editKey}
          order={order}
          onClose={() => setEditModal(false)}
          onSuccess={fetchOrder}
        />
      )}

      {addItemModal && (
        <AddItemModal
          orderId={order.id}
          onClose={() => setAddItemModal(false)}
          onSuccess={fetchOrder}
        />
      )}

      {cancelDialog && (
        <ConfirmDialog
          title="Cancelar orden de servicio"
          message={`¿Confirmás que querés cancelar la orden ${order.order_number}? Esta acción no se puede deshacer.`}
          confirmLabel="Cancelar orden"
          loading={statusLoading}
          onConfirm={handleCancel}
          onCancel={() => setCancelDialog(false)}
        />
      )}
    </div>
  );
}
