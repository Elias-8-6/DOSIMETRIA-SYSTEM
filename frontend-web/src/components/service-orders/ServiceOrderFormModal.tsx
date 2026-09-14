import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Client } from '../../api/clients.api';
import { getClients } from '../../api/clients.api';
import type { Dosimeter } from '../../api/dosimeters.api';
import { getDosimeters } from '../../api/dosimeters.api';
import type {
  CreateServiceOrderPayload,
  ServiceType,
  Priority,
  RequestedAction,
} from '../../api/serviceOrders.api';
import { createServiceOrder } from '../../api/serviceOrders.api';
import { useDebounce } from '../../hooks/useDebounce';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: 'lectura_dosis', label: 'Lectura de dosis' },
  { value: 'lectura_y_recarga', label: 'Lectura y recarga' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'calibracion', label: 'Calibración' },
];

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'urgente', label: 'Urgente' },
  { value: 'critica', label: 'Crítica' },
];

const REQUESTED_ACTIONS: { value: RequestedAction; label: string }[] = [
  { value: 'lectura', label: 'Lectura' },
  { value: 'limpieza', label: 'Limpieza' },
  { value: 'recarga', label: 'Recarga' },
  { value: 'inspeccion', label: 'Inspección' },
];

const sectionHead = (label: string, color: string) => (
  <div className="flex items-center gap-2 mb-3">
    <div className={`w-1 h-4 rounded-full ${color}`} />
    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</h3>
  </div>
);

interface DraftItem {
  dosimeter_id: string;
  serial_number: string;
  requested_action: RequestedAction;
}

export function ServiceOrderFormModal({ onClose, onSuccess }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState('');
  const [serviceType, setServiceType] = useState<ServiceType | ''>('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [requestedDate, setRequestedDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [observations, setObservations] = useState('');

  const [items, setItems] = useState<DraftItem[]>([]);
  const [dosimeterSearch, setDosimeterSearch] = useState('');
  const [dosimeterOptions, setDosimeterOptions] = useState<Dosimeter[]>([]);
  const [dosimeterId, setDosimeterId] = useState('');
  const [requestedAction, setRequestedAction] = useState<RequestedAction>('lectura');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const debouncedSearch = useDebounce(dosimeterSearch, 300);

  useEffect(() => {
    getClients({ status: 'active', limit: 100 })
      .then((res) => setClients(res.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    getDosimeters({ search: debouncedSearch || undefined, limit: 20 })
      .then((res) => setDosimeterOptions(res.items))
      .catch(() => setDosimeterOptions([]));
  }, [debouncedSearch]);

  const handleAddItem = () => {
    if (!dosimeterId) return;
    if (items.some((item) => item.dosimeter_id === dosimeterId)) {
      setError('Este dosímetro ya está en la lista');
      return;
    }
    const dosimeter = dosimeterOptions.find((d) => d.id === dosimeterId);
    setItems((prev) => [
      ...prev,
      {
        dosimeter_id: dosimeterId,
        serial_number: dosimeter?.serial_number ?? dosimeterId,
        requested_action: requestedAction,
      },
    ]);
    setDosimeterId('');
    setDosimeterSearch('');
    setError('');
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.dosimeter_id !== id));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!clientId || !serviceType) {
      setError('Completá el cliente y el tipo de servicio');
      return;
    }
    if (items.length === 0) {
      setError('Agregá al menos un dosímetro a la orden');
      return;
    }

    setLoading(true);
    try {
      const payload: CreateServiceOrderPayload = {
        client_id: clientId,
        service_type: serviceType,
        priority,
        items: items.map(({ dosimeter_id, requested_action }) => ({
          dosimeter_id,
          requested_action,
        })),
      };
      if (requestedDate) payload.requested_date = requestedDate;
      if (dueDate) payload.due_date = dueDate;
      if (observations) payload.observations = observations;

      await createServiceOrder(payload);
      onClose();
      onSuccess();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e?.response?.data?.message ?? 'Error al crear la orden de servicio';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Nueva orden de servicio" onClose={onClose} maxWidth="max-w-3xl">
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
        <div>
          {sectionHead('Datos generales', 'bg-blue-500')}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Cliente"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
            >
              <option value="">Seleccionar cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select
              label="Tipo de servicio"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value as ServiceType)}
              required
            >
              <option value="">Seleccionar tipo</option>
              {SERVICE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
            <Select
              label="Prioridad"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
            <Input
              label="Fecha solicitada"
              type="date"
              value={requestedDate}
              onChange={(e) => setRequestedDate(e.target.value)}
            />
            <Input
              label="Fecha límite"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div>
          {sectionHead('Dosímetros solicitados', 'bg-violet-400')}

          <div className="flex gap-2 items-end mb-3">
            <div className="flex-1">
              <Input
                label="Buscar dosímetro"
                type="text"
                value={dosimeterSearch}
                onChange={(e) => setDosimeterSearch(e.target.value)}
                placeholder="Serie o código interno..."
              />
            </div>
            <div className="flex-1">
              <Select label="Dosímetro" value={dosimeterId} onChange={(e) => setDosimeterId(e.target.value)}>
                <option value="">Seleccionar</option>
                {dosimeterOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.serial_number} {d.internal_code ? `(${d.internal_code})` : ''}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-40">
              <Select
                label="Acción"
                value={requestedAction}
                onChange={(e) => setRequestedAction(e.target.value as RequestedAction)}
              >
                {REQUESTED_ACTIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="button" variant="secondary" onClick={handleAddItem} disabled={!dosimeterId}>
              Agregar
            </Button>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-gray-400">Sin dosímetros agregados</p>
          ) : (
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
              {items.map((item) => (
                <div
                  key={item.dosimeter_id}
                  className="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <span className="text-gray-800">
                    {item.serial_number}{' '}
                    <span className="text-gray-400">
                      — {REQUESTED_ACTIONS.find((a) => a.value === item.requested_action)?.label}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.dosimeter_id)}
                    className="text-red-600 hover:text-red-700 cursor-pointer text-xs"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          )}
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
            {loading ? 'Creando...' : 'Crear orden'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
