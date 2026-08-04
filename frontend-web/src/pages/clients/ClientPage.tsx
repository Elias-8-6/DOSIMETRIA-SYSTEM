import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Client, ClientType } from '../../api/clients.api';
import { getClients } from '../../api/clients.api';
import { ClientFormModal } from '../../components/clients/ClientFormModal';
import { useDebounce } from '../../hooks/useDebounce';
import { DataTable, TableStatusRow, TH_CLASS, TD_CLASS } from '../../components/ui/DataTable';
import { Pagination } from '../../components/ui/Pagination';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';

const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  hospital: 'Hospital',
  clinica: 'Clínica',
  industria: 'Industria',
  investigacion: 'Investigación',
  gobierno: 'Gobierno',
  otro: 'Otro',
};

const CLIENT_TYPE_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Todos los tipos' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'clinica', label: 'Clínica' },
  { value: 'industria', label: 'Industria' },
  { value: 'investigacion', label: 'Investigación' },
  { value: 'gobierno', label: 'Gobierno' },
  { value: 'otro', label: 'Otro' },
];

const PAGE_SIZE = 10;

export default function ClientsPage() {
  const navigate = useNavigate();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modalKey, setModalKey] = useState(0);

  const [formModal, setFormModal] = useState<{ open: boolean; client: Client | null }>({
    open: false,
    client: null,
  });

  const debouncedSearch = useDebounce(search, 300);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getClients({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        client_type: typeFilter || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setClients(data.items);
      setTotalPages(Math.ceil(data.total / PAGE_SIZE));
    } catch {
      setError('No se pudo cargar el listado de clientes');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, typeFilter, page]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, typeFilter]);

  const handleFormSuccess = useCallback(() => {
    fetchClients();
  }, [fetchClients]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de instituciones cliente</p>
        </div>
        <Button
          onClick={() => {
            setModalKey((k) => k + 1);
            setFormModal({ open: true, client: null });
          }}
        >
          Nuevo cliente
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Buscar por nombre, código o contacto..."
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
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CLIENT_TYPE_FILTERS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <DataTable>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className={TH_CLASS}>Nombre</th>
              <th className={TH_CLASS}>Código</th>
              <th className={TH_CLASS}>Tipo</th>
              <th className={TH_CLASS}>Contacto</th>
              <th className={TH_CLASS}>Sedes</th>
              <th className={TH_CLASS}>Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableStatusRow colSpan={7}>Cargando...</TableStatusRow>
            ) : error ? (
              <TableStatusRow colSpan={7}>
                <span className="text-red-600">{error}</span>
              </TableStatusRow>
            ) : clients.length === 0 ? (
              <TableStatusRow colSpan={7}>No se encontraron clientes</TableStatusRow>
            ) : (
              clients.map((client) => (
                <tr
                  key={client.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className={`${TD_CLASS} font-medium text-gray-900`}>{client.name}</td>
                  <td className={`${TD_CLASS} text-gray-500`}>{client.code ?? '—'}</td>
                  <td className={`${TD_CLASS} text-gray-600`}>
                    {client.client_type ? CLIENT_TYPE_LABELS[client.client_type] : '—'}
                  </td>
                  <td className={TD_CLASS}>
                    <div>
                      <p className="text-gray-800">{client.contact_name ?? '—'}</p>
                      {client.contact_email && (
                        <p className="text-xs text-gray-400">{client.contact_email}</p>
                      )}
                    </div>
                  </td>
                  <td className={`${TD_CLASS} text-gray-600`}>{client.client_locations.length}</td>
                  <td className={TD_CLASS}>
                    <StatusBadge active={client.status === 'active'} />
                  </td>
                  <td className={TD_CLASS}>
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => navigate(`/clients/${client.id}`)}
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

      {/* Modal crear cliente */}
      {formModal.open && (
        <ClientFormModal
          key={modalKey}
          client={formModal.client}
          onClose={() => setFormModal({ open: false, client: null })}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
