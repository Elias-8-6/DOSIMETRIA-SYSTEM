import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ServiceOrder } from '../../api/serviceOrders.api';
import { getServiceOrders } from '../../api/serviceOrders.api';
import { ServiceOrderFormModal } from '../../components/service-orders/ServiceOrderFormModal';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../hooks/useToast';
import { DataTable, TableStatusRow, TH_CLASS, TD_CLASS } from '../../components/ui/DataTable';
import { Pagination } from '../../components/ui/Pagination';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { ServiceOrderStatusBadge } from '../../components/service-orders/ServiceOrderStatusBadge';
import {
  SERVICE_TYPE_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from '../../constants/serviceOrders';
import { useAuth } from '../../hooks/useAuth';
import { formatDate } from '../../utils/date';

const PAGE_SIZE = 10;

export default function ServiceOrdersPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { hasPermission } = useAuth();

  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);

  const debouncedSearch = useDebounce(search, 300);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getServiceOrders({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        service_type: serviceTypeFilter || undefined,
        priority: priorityFilter || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setOrders(data.items);
      setTotalPages(Math.ceil(data.total / PAGE_SIZE));
    } catch {
      setError('No se pudo cargar el listado de órdenes de servicio');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, serviceTypeFilter, priorityFilter, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, serviceTypeFilter, priorityFilter]);

  const handleFormSuccess = useCallback(() => {
    showToast('Orden de servicio creada correctamente');
    fetchOrders();
  }, [fetchOrders, showToast]);

  return (
    <div className="p-6">
      <PageHeader
        title="Órdenes de servicio"
        subtitle="Solicitudes de procesamiento de dosímetros"
        action={
          hasPermission('service_orders', 'create') && (
            <Button
              onClick={() => {
                setModalKey((k) => k + 1);
                setFormModalOpen(true);
              }}
            >
              Nueva orden
            </Button>
          )
        }
      />

      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Buscar por número de orden..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[220px] px-3 py-2 border border-gray-300 rounded-lg text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={serviceTypeFilter}
          onChange={(e) => setServiceTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas las prioridades</option>
          {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <DataTable>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className={TH_CLASS}>Número</th>
              <th className={TH_CLASS}>Cliente</th>
              <th className={TH_CLASS}>Tipo de servicio</th>
              <th className={TH_CLASS}>Estado</th>
              <th className={TH_CLASS}>Prioridad</th>
              <th className={TH_CLASS}>Ítems</th>
              <th className={TH_CLASS}>Creada</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableStatusRow colSpan={8}>Cargando...</TableStatusRow>
            ) : error ? (
              <TableStatusRow colSpan={8}>
                <span className="text-red-600">{error}</span>
              </TableStatusRow>
            ) : orders.length === 0 ? (
              <TableStatusRow colSpan={8}>No se encontraron órdenes de servicio</TableStatusRow>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className={`${TD_CLASS} font-medium text-gray-900`}>{order.order_number}</td>
                  <td className={`${TD_CLASS} text-gray-600`}>{order.clients.name}</td>
                  <td className={`${TD_CLASS} text-gray-600`}>{SERVICE_TYPE_LABELS[order.service_type]}</td>
                  <td className={TD_CLASS}>
                    <ServiceOrderStatusBadge status={order.status} />
                  </td>
                  <td className={`${TD_CLASS} text-gray-600`}>{PRIORITY_LABELS[order.priority]}</td>
                  <td className={`${TD_CLASS} text-gray-600`}>{order.items_count}</td>
                  <td className={`${TD_CLASS} text-gray-500`}>{formatDate(order.created_at)}</td>
                  <td className={TD_CLASS}>
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => navigate(`/service-orders/${order.id}`)}
                        className="text-blue-600 hover:text-blue-700 cursor-pointer"
                      >
                        Ver detalle
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </DataTable>

      {formModalOpen && (
        <ServiceOrderFormModal
          key={modalKey}
          onClose={() => setFormModalOpen(false)}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
