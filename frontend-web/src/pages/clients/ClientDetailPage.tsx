import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Client, ClientLocation, ClientStatus } from '../../api/clients.api';
import { getClient, updateClientStatus, updateClientLocationStatus } from '../../api/clients.api';
import { ClientFormModal } from '../../components/clients/ClientFormModal';
import { LocationFormModal } from '../../components/clients/LocationFormModal';
import { WorkerFormModal } from '../../components/workers/ WorkerFormModal.tsx';
import WorkersPage from '../workers/WorkersPage';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { StatusBadge } from '../../components/ui/StatusBadge';

const CLIENT_TYPE_LABELS: Record<string, string> = {
  hospital: 'Hospital',
  clinica: 'Clínica',
  industria: 'Industria',
  investigacion: 'Investigación',
  gobierno: 'Gobierno',
  otro: 'Otro',
};

const RADIATION_LABELS: Record<string, string> = {
  rayos_x: 'Rayos X',
  gamma: 'Gamma',
  neutrones: 'Neutrones',
  beta: 'Beta',
  mixta: 'Mixta',
  otro: 'Otro',
};

const RISK_BADGES: Record<string, string> = {
  bajo: 'bg-green-100 text-green-700',
  medio: 'bg-yellow-100 text-yellow-700',
  alto: 'bg-red-100 text-red-700',
};

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [locStatusLoading, setLocStatusLoading] = useState<string | null>(null);
  const [confirmingClientStatus, setConfirmingClientStatus] = useState(false);
  const [confirmingLocation, setConfirmingLocation] = useState<ClientLocation | null>(null);

  // Departamentos expandidos
  const [expandedLocs, setExpandedLocs] = useState<Record<string, boolean>>({});

  // Modales
  const [editClientModal, setEditClientModal] = useState(false);
  const [editClientKey, setEditClientKey] = useState(0);
  const [locationModal, setLocationModal] = useState<{
    open: boolean;
    location: ClientLocation | null;
  }>({ open: false, location: null });
  const [workerModal, setWorkerModal] = useState<{
    open: boolean;
    locationId: string | null;
    workerKey: number;
  }>({ open: false, locationId: null, workerKey: 0 });

  const fetchClient = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await getClient(id);
      setClient(data);
    } catch {
      setError('No se pudo cargar el cliente');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  const handleToggleStatus = async () => {
    if (!client) return;
    setStatusLoading(true);
    try {
      const newStatus: ClientStatus = client.status === 'active' ? 'inactive' : 'active';
      await updateClientStatus(client.id, newStatus);
      setClient({ ...client, status: newStatus });
    } finally {
      setStatusLoading(false);
      setConfirmingClientStatus(false);
    }
  };

  const handleToggleLocationStatus = async (loc: ClientLocation) => {
    if (!client) return;
    setLocStatusLoading(loc.id);
    try {
      const newStatus: ClientStatus = loc.status === 'active' ? 'inactive' : 'active';
      await updateClientLocationStatus(client.id, loc.id, newStatus);
      const updatedLocations = client.client_locations.map((l) =>
        l.id === loc.id ? { ...l, status: newStatus } : l,
      );
      setClient({ ...client, client_locations: updatedLocations });
    } finally {
      setLocStatusLoading(null);
      setConfirmingLocation(null);
    }
  };

  const handleLocationSuccess = (saved: ClientLocation) => {
    if (!client) return;
    const exists = client.client_locations.find((l) => l.id === saved.id);
    const updatedLocations = exists
      ? client.client_locations.map((l) => (l.id === saved.id ? saved : l))
      : [...client.client_locations, saved];
    setClient({ ...client, client_locations: updatedLocations });
    setLocationModal({ open: false, location: null });
  };

  const toggleLocation = (locId: string) => {
    setExpandedLocs((prev) => ({ ...prev, [locId]: !prev[locId] }));
  };

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

  if (error || !client) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">{error || 'Cliente no encontrado'}</p>
        <button
          onClick={() => navigate('/clients')}
          className="mt-4 text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
        >
          ← Volver a clientes
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => navigate('/clients')}
            className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer mb-2 block"
          >
            ← Volver a clientes
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
            {client.code && <span className="text-sm text-gray-400">{client.code}</span>}
            <StatusBadge active={client.status === 'active'} />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => {
              setEditClientKey((k) => k + 1);
              setEditClientModal(true);
            }}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 border bg-gray-100 border-gray-300 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
          >
            Editar
          </button>
          <button
            onClick={() => setConfirmingClientStatus(true)}
            disabled={statusLoading}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer disabled:cursor-not-allowed ${
              client.status === 'active'
                ? 'text-red-600 bg-red-100 border-red-200 hover:bg-red-200'
                : 'text-green-800 bg-green-100 border-green-300 hover:bg-green-200'
            }`}
          >
            {statusLoading ? '...' : client.status === 'active' ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      </div>

      {confirmingClientStatus && (
        <ConfirmDialog
          title={client.status === 'active' ? 'Desactivar cliente' : 'Activar cliente'}
          message={
            client.status === 'active'
              ? `¿Seguro que querés desactivar a ${client.name}? Sus departamentos y trabajadores seguirán existiendo, pero el cliente quedará marcado como inactivo.`
              : `¿Reactivar a ${client.name}?`
          }
          confirmLabel={client.status === 'active' ? 'Desactivar' : 'Activar'}
          danger={client.status === 'active'}
          loading={statusLoading}
          onConfirm={handleToggleStatus}
          onCancel={() => setConfirmingClientStatus(false)}
        />
      )}

      {/* Info del cliente */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Datos institucionales */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
            Datos institucionales
          </h2>
          <div className="grid grid-cols-2 gap-y-4 gap-x-6">
            {field('Tipo', client.client_type ? CLIENT_TYPE_LABELS[client.client_type] : null)}
            {field('Teléfono', client.phone)}
            {field('Dirección', client.address)}
            {field('Sitio web', client.website)}
          </div>
        </div>

        {/* Contacto y contrato */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          {(client.contact_name || client.contact_email) && (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Contacto
              </h2>
              <div className="grid grid-cols-2 gap-y-3 gap-x-6">
                {field('Nombre', client.contact_name)}
                {field('Email', client.contact_email)}
              </div>
            </div>
          )}
          {(client.contract_start_date || client.contract_end_date) && (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Contrato
              </h2>
              <div className="grid grid-cols-2 gap-y-3 gap-x-6">
                {field('Inicio', client.contract_start_date)}
                {field('Vencimiento', client.contract_end_date)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Departamentos */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-800">
            Departamentos
            <span className="ml-2 text-xs font-normal text-gray-400">
              ({client.client_locations.length})
            </span>
          </h2>
          <button
            onClick={() => setLocationModal({ open: true, location: null })}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            + Agregar departamento
          </button>
        </div>

        {client.client_locations.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center">Sin departamentos registrados</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {client.client_locations.map((loc) => (
              <div key={loc.id}>
                {/* Header del departamento */}
                <div className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                  <button
                    onClick={() => toggleLocation(loc.id)}
                    className="flex items-center gap-3 flex-1 text-left cursor-pointer"
                  >
                    <span
                      className={`text-xs transition-transform ${expandedLocs[loc.id] ? 'rotate-90' : ''}`}
                    >
                      ▶
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-800">{loc.name}</p>
                      {loc.risk_level && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${RISK_BADGES[loc.risk_level]}`}
                        >
                          Riesgo {loc.risk_level}
                        </span>
                      )}
                      <StatusBadge active={loc.status === 'active'} />
                      {loc.radiation_type && (
                        <span className="text-xs text-gray-400">
                          {RADIATION_LABELS[loc.radiation_type]}
                        </span>
                      )}
                      {loc.contact_name && (
                        <span className="text-xs text-gray-400">Resp: {loc.contact_name}</span>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <button
                      onClick={() => setLocationModal({ open: true, location: loc })}
                      className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setConfirmingLocation(loc)}
                      disabled={locStatusLoading === loc.id}
                      className={`text-xs cursor-pointer disabled:cursor-not-allowed ${
                        loc.status === 'active'
                          ? 'text-red-500 hover:text-red-700'
                          : 'text-green-600 hover:text-green-700'
                      }`}
                    >
                      {locStatusLoading === loc.id
                        ? '...'
                        : loc.status === 'active'
                          ? 'Desactivar'
                          : 'Activar'}
                    </button>
                    <button
                      onClick={() =>
                        setWorkerModal({
                          open: true,
                          locationId: loc.id,
                          workerKey: workerModal.workerKey + 1,
                        })
                      }
                      className="text-xs font-medium text-emerald-600 hover:text-emerald-700 cursor-pointer"
                    >
                      + Trabajador
                    </button>
                  </div>
                </div>

                {/* Workers del departamento — expandible */}
                {expandedLocs[loc.id] && (
                  <div className="bg-gray-50 px-5 py-4 border-t border-gray-100">
                    <WorkersPage clientId={client.id} clientLocationId={loc.id} embedded />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal editar cliente */}
      {editClientModal && (
        <ClientFormModal
          key={editClientKey}
          client={client}
          onClose={() => setEditClientModal(false)}
          onSuccess={() => {
            fetchClient();
          }}
        />
      )}

      {/* Modal departamento */}
      {locationModal.open && (
        <LocationFormModal
          clientId={client.id}
          location={locationModal.location}
          onClose={() => setLocationModal({ open: false, location: null })}
          onSuccess={handleLocationSuccess}
        />
      )}

      {/* Confirmación de estado de sede */}
      {confirmingLocation && (
        <ConfirmDialog
          title={confirmingLocation.status === 'active' ? 'Desactivar sede' : 'Activar sede'}
          message={
            confirmingLocation.status === 'active'
              ? `¿Seguro que querés desactivar "${confirmingLocation.name}"? Sus trabajadores seguirán existiendo, pero la sede quedará marcada como inactiva.`
              : `¿Reactivar "${confirmingLocation.name}"?`
          }
          confirmLabel={confirmingLocation.status === 'active' ? 'Desactivar' : 'Activar'}
          danger={confirmingLocation.status === 'active'}
          loading={locStatusLoading === confirmingLocation.id}
          onConfirm={() => handleToggleLocationStatus(confirmingLocation)}
          onCancel={() => setConfirmingLocation(null)}
        />
      )}

      {/* Modal nuevo trabajador */}
      {workerModal.open && (
        <WorkerFormModal
          key={workerModal.workerKey}
          clientId={client.id}
          clientLocationId={workerModal.locationId ?? undefined}
          onClose={() => setWorkerModal({ open: false, locationId: null, workerKey: 0 })}
          onSuccess={() => {
            setWorkerModal({ open: false, locationId: null, workerKey: 0 });
          }}
        />
      )}
    </div>
  );
}
