import { useState, useEffect, useCallback } from 'react';
import type { Client, ClientType } from '../../api/clients.api.ts';
import { getClients, updateClientStatus } from '../../api/clients.api.ts';
import { ClientFormModal } from '../../components/clients/ClientFormModal';
import { ClientDetailModal } from '../../components/clients/ClientDetailModal';

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

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [modalKey, setModalKey] = useState(0);
  const [formModal, setFormModal] = useState<{ open: boolean; client: Client | null }>({
    open: false,
    client: null,
  });
  const [detailModal, setDetailModal] = useState<{ open: boolean; client: Client | null }>({
    open: false,
    client: null,
  });

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getClients({
        search: search || undefined,
        status: statusFilter || undefined,
        client_type: typeFilter || undefined,
      });
      setClients(data);
    } catch {
      // silencioso — el usuario ve la tabla vacía
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchClients, 300);
    return () => clearTimeout(timer);
  }, [fetchClients]);

  const handleFormSuccess = useCallback(() => {
    fetchClients();
  }, [fetchClients]);

  const handleDetailUpdate = (updated: Client) => {
    setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    if (detailModal.client?.id === updated.id) {
      setDetailModal((prev) => ({ ...prev, client: updated }));
    }
  };

  const handleEditFromDetail = (client: Client) => {
    setDetailModal({ open: false, client: null });
    setModalKey((k) => k + 1);
    setFormModal({ open: true, client });
  };

  const handleQuickStatus = async (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = client.status === 'active' ? 'inactive' : 'active';
    try {
      await updateClientStatus(client.id, newStatus);
      setClients((prev) => prev.map((c) => (c.id === client.id ? { ...c, status: newStatus } : c)));
    } catch {
      // silencioso
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de instituciones cliente</p>
        </div>
        <button
          onClick={() => {
            setModalKey((k) => k + 1);
            setFormModal({ open: true, client: null });
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
        >
          Nuevo cliente
        </button>
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
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Código</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Contacto</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Sedes</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  Cargando...
                </td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  No se encontraron clientes
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr
                  key={client.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{client.name}</td>
                  <td className="px-4 py-3 text-gray-500">{client.code ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {client.client_type ? CLIENT_TYPE_LABELS[client.client_type] : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-gray-800">{client.contact_name ?? '—'}</p>
                      {client.contact_email && (
                        <p className="text-xs text-gray-400">{client.contact_email}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{client.client_locations.length}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        client.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {client.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => {
                          setModalKey((k) => k + 1);
                          setFormModal({ open: true, client });
                        }}
                        className="text-gray-500 hover:text-gray-700 cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setDetailModal({ open: true, client })}
                        className="text-blue-600 hover:text-blue-700 cursor-pointer"
                      >
                        Ver detalle
                      </button>
                      <button
                        onClick={(e) => handleQuickStatus(client, e)}
                        className={`cursor-pointer ${
                          client.status === 'active'
                            ? 'text-red-500 hover:text-red-700'
                            : 'text-green-600 hover:text-green-700'
                        }`}
                      >
                        {client.status === 'active' ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modales */}
      {formModal.open && (
        <ClientFormModal
          key={modalKey}
          client={formModal.client}
          onClose={() => setFormModal({ open: false, client: null })}
          onSuccess={handleFormSuccess}
        />
      )}

      {detailModal.open && detailModal.client && (
        <ClientDetailModal
          client={detailModal.client}
          onClose={() => setDetailModal({ open: false, client: null })}
          onUpdate={handleDetailUpdate}
          onEdit={handleEditFromDetail}
        />
      )}
    </div>
  );
}
