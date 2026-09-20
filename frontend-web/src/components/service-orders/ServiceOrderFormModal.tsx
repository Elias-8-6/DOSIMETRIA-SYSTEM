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
  ClientDosimeterItem,
  ServiceOrderDetail,
} from '../../api/serviceOrders.api';
import {
  createServiceOrder,
  getClientDosimeters,
  getServiceOrder,
} from '../../api/serviceOrders.api';
import { DocumentPreviewModal } from './documents/DocumentPreviewModal';
import { useDebounce } from '../../hooks/useDebounce';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { isDateAfterOrEqual } from '../../utils/validation';
import { today } from '../../utils/date';
import { extractApiError } from '../../utils/api';

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
  worker_name?: string;
  worker_id?: string;
  type_code?: string;
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
  const [clientDosimeters, setClientDosimeters] = useState<ClientDosimeterItem[]>([]);
  const [loadingClientDosimeters, setLoadingClientDosimeters] = useState(false);

  const [dosimeterSearch, setDosimeterSearch] = useState('');
  const [dosimeterOptions, setDosimeterOptions] = useState<Dosimeter[]>([]);
  const [dosimeterId, setDosimeterId] = useState('');
  const [requestedAction, setRequestedAction] = useState<RequestedAction>('lectura');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [createdOrderDetail, setCreatedOrderDetail] = useState<ServiceOrderDetail | null>(null);
  const [showDocModal, setShowDocModal] = useState(false);
  const [previewDocType, setPreviewDocType] = useState<'repdos01' | 'deliveryNote'>('repdos01');

  const debouncedSearch = useDebounce(dosimeterSearch, 300);

  useEffect(() => {
    getClients({ status: 'active', limit: 100 })
      .then((res) => setClients(res.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!clientId) {
      setClientDosimeters([]);
      return;
    }
    setLoadingClientDosimeters(true);
    getClientDosimeters(clientId)
      .then((dos) => setClientDosimeters(dos))
      .catch(() => setClientDosimeters([]))
      .finally(() => setLoadingClientDosimeters(false));
  }, [clientId]);

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
        type_code: dosimeter?.dosimeter_types?.code,
        requested_action: requestedAction,
      },
    ]);
    setDosimeterId('');
    setDosimeterSearch('');
    setError('');
  };

  const handleAddClientDosimeter = (cd: ClientDosimeterItem) => {
    if (items.some((item) => item.dosimeter_id === cd.dosimeter_id)) return;
    setItems((prev) => [
      ...prev,
      {
        dosimeter_id: cd.dosimeter_id,
        serial_number: cd.serial_number,
        worker_name: cd.worker?.full_name,
        worker_id: cd.worker?.document_number || undefined,
        type_code: cd.dosimeter_type?.code || cd.model || undefined,
        requested_action: requestedAction,
      },
    ]);
    setError('');
  };

  const handleAddAllClientDosimeters = () => {
    const newItems: DraftItem[] = [];
    for (const cd of clientDosimeters) {
      if (!items.some((item) => item.dosimeter_id === cd.dosimeter_id)) {
        newItems.push({
          dosimeter_id: cd.dosimeter_id,
          serial_number: cd.serial_number,
          worker_name: cd.worker?.full_name,
          worker_id: cd.worker?.document_number || undefined,
          type_code: cd.dosimeter_type?.code || cd.model || undefined,
          requested_action: requestedAction,
        });
      }
    }
    setItems((prev) => [...prev, ...newItems]);
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

    if (dueDate && !isDateAfterOrEqual(dueDate, today())) {
      setError('La fecha límite debe ser hoy o una fecha futura');
      return;
    }

    if (dueDate && requestedDate && !isDateAfterOrEqual(dueDate, requestedDate)) {
      setError('La fecha límite no puede ser anterior a la fecha solicitada');
      return;
    }

    if (observations && observations.length > 500) {
      setError('Las observaciones no pueden superar los 500 caracteres');
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

      const created = await createServiceOrder(payload);
      const fullDetail = await getServiceOrder(created.id);
      setCreatedOrderDetail(fullDetail);
      onSuccess();
    } catch (err) {
      setError(extractApiError(err, 'Error al crear la orden de servicio'));
    } finally {
      setLoading(false);
    }
  };

  if (createdOrderDetail) {
    return (
      <>
        <Modal title="Orden de servicio creada" onClose={onClose} maxWidth="max-w-2xl">
          <div className="p-6 space-y-6 text-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
              ✓
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900">
                ¡Orden {createdOrderDetail.order_number} creada con éxito!
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Cliente: <strong>{createdOrderDetail.clients?.name}</strong> ·{' '}
                {createdOrderDetail.service_order_items?.length} dosímetro(s) incluidos.
              </p>
            </div>

            <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-5 text-left space-y-3">
              <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                Documentación física oficial generada
              </h3>
              <p className="text-xs text-blue-700">
                Podés ver e imprimir de inmediato los documentos generados con los datos de esta orden:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewDocType('repdos01');
                    setShowDocModal(true);
                  }}
                  className="p-3 rounded-lg border border-blue-300 bg-white hover:bg-blue-50 text-left transition-all shadow-xs cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📄</span>
                    <span className="text-xs font-bold text-gray-900 group-hover:text-blue-700">
                      Formulario REPDOS-01
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Entrega y recibo de dosímetros por usuario y PIN (REPDOS-01).
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPreviewDocType('deliveryNote');
                    setShowDocModal(true);
                  }}
                  className="p-3 rounded-lg border border-purple-300 bg-white hover:bg-purple-50 text-left transition-all shadow-xs cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📦</span>
                    <span className="text-xs font-bold text-gray-900 group-hover:text-purple-700">
                      Nota de Entrega
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Carta membretada formal de entrega de mercancía.
                  </p>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <Button variant="secondary" onClick={onClose}>
                Finalizar y cerrar
              </Button>
            </div>
          </div>
        </Modal>

        {showDocModal && (
          <DocumentPreviewModal
            order={createdOrderDetail}
            initialDocument={previewDocType}
            onClose={() => setShowDocModal(false)}
          />
        )}
      </>
    );
  }

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
              min={today()}
            />
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="Notas de entrega, período o instrucciones especiales..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div>
          {sectionHead('Dosímetros solicitados', 'bg-violet-400')}

          {/* Dosímetros asignados al cliente (si existen) */}
          {clientId && (
            <div className="mb-4 p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-blue-900">
                  Dosímetros activos asignados al cliente ({clientDosimeters.length})
                </span>
                {clientDosimeters.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAddAllClientDosimeters}
                    className="text-xs text-blue-700 font-semibold hover:text-blue-900 underline cursor-pointer"
                  >
                    + Agregar todos ({clientDosimeters.length})
                  </button>
                )}
              </div>

              {loadingClientDosimeters ? (
                <p className="text-xs text-gray-400 py-1">Cargando dosímetros del cliente...</p>
              ) : clientDosimeters.length === 0 ? (
                <p className="text-xs text-gray-500 italic">
                  Este cliente no tiene dosímetros actualmente asignados. Podés agregar dosímetros individualmente abajo.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pt-1">
                  {clientDosimeters.map((cd) => {
                    const isAdded = items.some((i) => i.dosimeter_id === cd.dosimeter_id);
                    return (
                      <button
                        key={cd.dosimeter_id}
                        type="button"
                        disabled={isAdded}
                        onClick={() => handleAddClientDosimeter(cd)}
                        className={`px-2.5 py-1 text-xs rounded-lg border text-left transition-colors cursor-pointer flex items-center gap-1.5 ${
                          isAdded
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            : 'bg-white text-gray-800 border-blue-200 hover:border-blue-400 hover:bg-blue-50'
                        }`}
                        title={cd.worker?.full_name ? `Usuario: ${cd.worker.full_name}` : 'Sin usuario asignado'}
                      >
                        <span className="font-mono font-medium">{cd.serial_number}</span>
                        {cd.worker?.full_name && (
                          <span className="text-gray-500 font-normal">
                            ({cd.worker.full_name.split(' ')[0]})
                          </span>
                        )}
                        {isAdded && <span className="text-green-600 font-bold">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Búsqueda manual de dosímetros */}
          <div className="flex gap-2 items-end mb-3">
            <div className="flex-1">
              <Input
                label="Buscar otro dosímetro"
                type="text"
                value={dosimeterSearch}
                onChange={(e) => setDosimeterSearch(e.target.value)}
                placeholder="Serie o código interno (ej. Control de Área)..."
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

          {/* Lista de dosímetros en la orden */}
          {items.length === 0 ? (
            <p className="text-sm text-gray-400 py-3 text-center border border-dashed border-gray-200 rounded-lg">
              Sin dosímetros agregados a esta orden
            </p>
          ) : (
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-56 overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.dosimeter_id}
                  className="flex items-center justify-between px-3.5 py-2.5 text-xs hover:bg-gray-50/50"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-gray-900">{item.serial_number}</span>
                    {item.worker_name ? (
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium border border-blue-100">
                        {item.worker_name}
                        {item.worker_id && <span className="text-blue-500 ml-1">· ID: {item.worker_id}</span>}
                      </span>
                    ) : (
                      <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                        Control / Sin usuario
                      </span>
                    )}
                    <span className="text-gray-400">
                      — {REQUESTED_ACTIONS.find((a) => a.value === item.requested_action)?.label}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.dosimeter_id)}
                    className="text-red-600 hover:text-red-700 cursor-pointer text-xs font-medium ml-2"
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

        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            Total dosímetros: <strong>{items.length}</strong>
          </span>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando orden...' : 'Crear orden y generar documentos'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
