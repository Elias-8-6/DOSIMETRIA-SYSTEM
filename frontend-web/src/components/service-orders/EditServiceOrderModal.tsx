import { useState } from 'react';
import type { FormEvent } from 'react';
import type { ServiceOrderDetail, UpdateServiceOrderPayload, Priority } from '../../api/serviceOrders.api';
import { updateServiceOrder } from '../../api/serviceOrders.api';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

interface Props {
  order: ServiceOrderDetail;
  onClose: () => void;
  onSuccess: () => void;
}

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'urgente', label: 'Urgente' },
  { value: 'critica', label: 'Crítica' },
];

export function EditServiceOrderModal({ order, onClose, onSuccess }: Props) {
  const [dueDate, setDueDate] = useState(order.due_date ?? '');
  const [priority, setPriority] = useState<Priority>(order.priority);
  const [observations, setObservations] = useState(order.observations ?? '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const payload: UpdateServiceOrderPayload = {};
    if (dueDate !== (order.due_date ?? '')) payload.due_date = dueDate;
    if (priority !== order.priority) payload.priority = priority;
    if (observations !== (order.observations ?? '')) payload.observations = observations;

    if (Object.keys(payload).length === 0) {
      setError('No hay cambios para guardar');
      return;
    }

    setLoading(true);
    try {
      await updateServiceOrder(order.id, payload);
      onClose();
      onSuccess();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e?.response?.data?.message ?? 'Error al actualizar la orden de servicio';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Editar orden ${order.order_number}`} onClose={onClose} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        <Input
          label="Fecha límite"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <Select label="Prioridad" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
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
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
