import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { DocumentPreviewModal } from '../../components/service-orders/documents/DocumentPreviewModal';
import { useDebounce } from '../../hooks/useDebounce';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { SectionHead } from '../../components/ui/SectionHead';
import { isDateAfterOrEqual } from '../../utils/validation';
import { today } from '../../utils/date';
import { extractApiError } from '../../utils/api';

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

interface DraftItem {
  dosimeter_id: string;
  serial_number: string;
  worker_name?: string;
  worker_id?: string;
  type_code?: string;
  requested_action: RequestedAction;
}

export default function CreateServiceOrderPage() {
  const navigate = useNavigate();

  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState('');
  const [serviceType, setServiceType] = useState<ServiceType | ''>('lectura_dosis');
  const [priority, setPriority] = useState<Priority>('normal');
  const [requestedDate, setRequestedDate] = useState(today());
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
      setError('Este dosímetro ya está en la orden');
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
    } catch (err) {
      setError(extractApiError(err, 'Error al crear la orden de servicio'));
    } finally {
      setLoading(false);
    }
  };

  // Pantalla de Confirmación y Generación de Documentos
  if (createdOrderDetail) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <button
            onClick={() => navigate('/service-orders')}
            className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer mb-2 block"
          >
            ← Volver a órdenes de servicio
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center space-y-6">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold shadow-xs">
            ✓
          </div>

          <div>
            <span className="text-xs uppercase tracking-widest text-green-700 font-bold bg-green-50 px-3 py-1 rounded-full border border-green-200">
              Orden Registrada Exitosamente
            </span>
            <h1 className="text-3xl font-extrabold text-gray-900 mt-3">
              {createdOrderDetail.order_number}
            </h1>
            <p className="text-sm text-gray-600 mt-2 max-w-xl mx-auto">
              Cliente: <strong>{createdOrderDetail.clients?.name}</strong> ·{' '}
              Se registraron <strong>{createdOrderDetail.service_order_items?.length} dosímetros</strong> listos para el ciclo de procesamiento.
            </p>
          </div>

          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-6 text-left space-y-4 max-w-3xl mx-auto">
            <div>
              <h3 className="text-sm font-bold text-blue-950 uppercase tracking-wide">
                Documentación física oficial generada
              </h3>
              <p className="text-xs text-blue-800 mt-1">
                La orden emula la documentación física de entrega y recibo. Podés visualizarla, verificarla e imprimirla en formato oficial:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="p-5 rounded-xl border border-blue-300 bg-white hover:border-blue-500 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">📄</span>
                    <h4 className="text-sm font-bold text-gray-900">
                      Formulario REPDOS-01
                    </h4>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Formulario oficial de entrega y recibo de dosímetros (clientes). Contiene la lista detallada con PIN, Usuario asignado, Cédula/ID, tipo de dosímetro y casillas de verificación.
                  </p>
                </div>
                <Button
                  variant="primary"
                  onClick={() => {
                    setPreviewDocType('repdos01');
                    setShowDocModal(true);
                  }}
                >
                  Ver e Imprimir REPDOS-01
                </Button>
              </div>

              <div className="p-5 rounded-xl border border-purple-300 bg-white hover:border-purple-500 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">📦</span>
                    <h4 className="text-sm font-bold text-gray-900">
                      Nota de Entrega de Mercancía
                    </h4>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Carta membretada formal de Horacio Icaza y Cía., S.A. con desglose de catálogo, descripción, total de dosímetros, número de cuenta y firma de apoderado legal.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setPreviewDocType('deliveryNote');
                    setShowDocModal(true);
                  }}
                >
                  Ver e Imprimir Nota de Entrega
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 pt-4 border-t border-gray-100">
            <Button
              variant="secondary"
              onClick={() => navigate(`/service-orders/${createdOrderDetail.id}`)}
            >
              Ir al detalle de la orden
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setCreatedOrderDetail(null);
                setItems([]);
                setClientId('');
                setObservations('');
              }}
            >
              Crear otra orden
            </Button>
            <Button variant="primary" onClick={() => navigate('/service-orders')}>
              Finalizar y volver a la lista
            </Button>
          </div>
        </div>

        {showDocModal && (
          <DocumentPreviewModal
            order={createdOrderDetail}
            initialDocument={previewDocType}
            onClose={() => setShowDocModal(false)}
          />
        )}
      </div>
    );
  }

  // Formulario Completo en Página
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Navegación y Cabecera */}
      <div>
        <button
          onClick={() => navigate('/service-orders')}
          className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer mb-2 block"
        >
          ← Volver a órdenes de servicio
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nueva orden de servicio</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Registro completo de solicitud y emulación de documentos de entrega (REPDOS-01 y Nota de Entrega)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => navigate('/service-orders')}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Creando orden...' : 'Crear orden y generar documentos'}
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Datos Generales */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-4">
            <SectionHead label="Datos generales de la orden" />

            <Select
              label="Cliente / Institución"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
            >
              <option value="">Seleccionar institución cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.code ? `(Cuenta: ${c.code})` : ''}
                </option>
              ))}
            </Select>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Tipo de servicio"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as ServiceType)}
                required
              >
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
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observaciones / Período
              </label>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Ejemplo: Período febrero 2026. Dosímetros TLD personales para Radiología..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Resumen */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-4">
            <SectionHead label="Resumen de preparación" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Total de dosímetros en la orden:</span>
                <span className="font-bold text-gray-900">{items.length}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Cliente seleccionado:</span>
                <span className="font-medium text-gray-900 truncate max-w-[200px]">
                  {clients.find((c) => c.id === clientId)?.name || 'Ninguno'}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Documentos a emitir:</span>
                <span className="font-medium text-blue-700">REPDOS-01 y Nota de Entrega</span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 flex gap-3">
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Creando orden...' : 'Crear orden y generar documentos'}
              </Button>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Dosímetros Solicitados */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <SectionHead label="Dosímetros solicitados" />
              <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                {items.length} seleccionado(s)
              </span>
            </div>

            {/* Dosímetros asignados al cliente (si existen) */}
            {clientId && (
              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                      Dosímetros activos del cliente
                    </span>
                    <span className="ml-2 text-xs text-blue-700 font-medium">
                      ({clientDosimeters.length} disponibles)
                    </span>
                  </div>
                  {clientDosimeters.length > 0 && (
                    <button
                      type="button"
                      onClick={handleAddAllClientDosimeters}
                      className="text-xs bg-blue-600 text-white hover:bg-blue-700 px-3 py-1 rounded-md font-semibold cursor-pointer shadow-xs transition-colors"
                    >
                      + Agregar todos ({clientDosimeters.length})
                    </button>
                  )}
                </div>

                {loadingClientDosimeters ? (
                  <p className="text-xs text-gray-400 py-2">Consultando inventario del cliente...</p>
                ) : clientDosimeters.length === 0 ? (
                  <p className="text-xs text-gray-600 italic">
                    Este cliente no tiene dosímetros actualmente asignados a sus trabajadores. Podés agregar dosímetros individualmente abajo.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pt-1">
                    {clientDosimeters.map((cd) => {
                      const isAdded = items.some((i) => i.dosimeter_id === cd.dosimeter_id);
                      return (
                        <button
                          key={cd.dosimeter_id}
                          type="button"
                          disabled={isAdded}
                          onClick={() => handleAddClientDosimeter(cd)}
                          className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between text-xs ${
                            isAdded
                              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                              : 'bg-white text-gray-800 border-blue-200 hover:border-blue-400 hover:bg-blue-50 shadow-2xs'
                          }`}
                        >
                          <div className="truncate pr-1">
                            <p className="font-mono font-bold text-gray-900">
                              {cd.serial_number}
                            </p>
                            <p className="text-[11px] text-gray-500 truncate">
                              {cd.worker?.full_name || 'Sin usuario asignado'}
                            </p>
                          </div>
                          {isAdded ? (
                            <span className="text-green-600 font-bold text-xs">Agregado</span>
                          ) : (
                            <span className="text-blue-600 font-bold text-base">+</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Búsqueda manual de otro dosímetro */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Búsqueda manual (dosímetros adicionales o controles)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-4">
                  <Input
                    label="Buscar por serie"
                    type="text"
                    value={dosimeterSearch}
                    onChange={(e) => setDosimeterSearch(e.target.value)}
                    placeholder="Serie o código interno..."
                  />
                </div>
                <div className="sm:col-span-4">
                  <Select
                    label="Dosímetro"
                    value={dosimeterId}
                    onChange={(e) => setDosimeterId(e.target.value)}
                  >
                    <option value="">Seleccionar</option>
                    {dosimeterOptions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.serial_number} {d.internal_code ? `(${d.internal_code})` : ''}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="sm:col-span-2">
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
                <div className="sm:col-span-2 flex gap-2 items-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAddItem}
                    disabled={!dosimeterId}
                    className="w-full"
                  >
                    Agregar
                  </Button>
                </div>
              </div>
            </div>

            {/* Tabla Principal de Ítems en la Orden */}
            <div>
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Lista de dosímetros en esta orden ({items.length})
              </h3>

              {items.length === 0 ? (
                <div className="py-12 border-2 border-dashed border-gray-200 rounded-xl text-center">
                  <p className="text-sm text-gray-400">
                    No has agregado dosímetros a la orden todavía.
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Selecciona un cliente arriba para ver sus dosímetros o búscalos manualmente.
                  </p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 font-semibold text-gray-600">
                        <th className="py-2.5 px-3">PIN / Serie</th>
                        <th className="py-2.5 px-3">Usuario asignado</th>
                        <th className="py-2.5 px-3">ID / Cédula</th>
                        <th className="py-2.5 px-3">Tipo D.</th>
                        <th className="py-2.5 px-3">Acción</th>
                        <th className="py-2.5 px-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {items.map((item) => (
                        <tr key={item.dosimeter_id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-gray-900">
                            {item.serial_number}
                          </td>
                          <td className="py-2.5 px-3 text-gray-800 font-medium">
                            {item.worker_name ? (
                              item.worker_name
                            ) : (
                              <span className="text-gray-400 italic">Control de Área / Lab</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-gray-600">
                            {item.worker_id || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-gray-600">
                            {item.type_code || '82-Standard-CH'}
                          </td>
                          <td className="py-2.5 px-3 text-gray-600">
                            {REQUESTED_ACTIONS.find((a) => a.value === item.requested_action)?.label}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.dosimeter_id)}
                              className="text-red-600 hover:text-red-800 font-medium cursor-pointer"
                            >
                              Quitar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
