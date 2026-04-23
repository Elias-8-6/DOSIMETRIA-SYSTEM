import { useState } from 'react';
import type { Client, ClientLocation, ClientStatus } from '../../api/clients.api.ts';
import { updateClientStatus, updateClientLocationStatus } from '../../api/clients.api.ts';
import { LocationFormModal } from './LocationFormModal';

interface Props {
  client: Client;
  onClose: () => void;
  onUpdate: (client: Client) => void;
  onEdit: (client: Client) => void;
}

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

export function ClientDetailModal({ client, onClose, onUpdate, onEdit }: Props) {
  const [localClient, setLocalClient] = useState<Client>(client);
  const [locationModal, setLocationModal] = useState<{
    open: boolean;
    location: ClientLocation | null;
  }>({ open: false, location: null });
  const [statusLoading, setStatusLoading] = useState(false);
  const [locStatusLoading, setLocStatusLoading] = useState<string | null>(null);

  const handleToggleClientStatus = async () => {
    setStatusLoading(true);
    try {
      const newStatus: ClientStatus = localClient.status === 'active' ? 'inactive' : 'active';
      await updateClientStatus(localClient.id, newStatus);
      const updated = { ...localClient, status: newStatus };
      setLocalClient(updated);
      onUpdate(updated);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleToggleLocationStatus = async (loc: ClientLocation) => {
    setLocStatusLoading(loc.id);
    try {
      const newStatus: ClientStatus = loc.status === 'active' ? 'inactive' : 'active';
      await updateClientLocationStatus(localClient.id, loc.id, newStatus);
      const updatedLocations = localClient.client_locations.map((l) =>
        l.id === loc.id ? { ...l, status: newStatus } : l,
      );
      const updated = { ...localClient, client_locations: updatedLocations };
      setLocalClient(updated);
      onUpdate(updated);
    } finally {
      setLocStatusLoading(null);
    }
  };

  const handleLocationSuccess = (saved: ClientLocation) => {
    const exists = localClient.client_locations.find((l) => l.id === saved.id);
    const updatedLocations = exists
      ? localClient.client_locations.map((l) => (l.id === saved.id ? saved : l))
      : [...localClient.client_locations, saved];
    const updated = { ...localClient, client_locations: updatedLocations };
    setLocalClient(updated);
    onUpdate(updated);
    setLocationModal({ open: false, location: null });
  };

  const field = (label: string, value: string | null | undefined) =>
    value ? (
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-800 mt-0.5">{value}</p>
      </div>
    ) : null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{localClient.name}</h2>
                {localClient.code && (
                  <p className="text-xs text-gray-400 mt-0.5">{localClient.code}</p>
                )}
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  localClient.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {localClient.status === 'active' ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(localClient)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors cursor-pointer"
              >
                Editar
              </button>
              <button
                onClick={handleToggleClientStatus}
                disabled={statusLoading}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed ${
                  localClient.status === 'active'
                    ? 'text-red-600 border border-red-200 hover:bg-red-50'
                    : 'text-green-600 border border-green-200 hover:bg-green-50'
                }`}
              >
                {statusLoading ? '...' : localClient.status === 'active' ? 'Desactivar' : 'Activar'}
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none cursor-pointer ml-1"
              >
                ×
              </button>
            </div>
          </div>

          <div className="px-6 py-5 space-y-6">
            {/* Datos institucionales */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Datos institucionales
              </h3>
              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                {field(
                  'Tipo',
                  localClient.client_type ? CLIENT_TYPE_LABELS[localClient.client_type] : null,
                )}
                {field('Teléfono', localClient.phone)}
                {field('Dirección', localClient.address)}
                {field('Sitio web', localClient.website)}
              </div>
            </div>

            {/* Contacto */}
            {(localClient.contact_name || localClient.contact_email) && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Contacto
                </h3>
                <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                  {field('Nombre', localClient.contact_name)}
                  {field('Email', localClient.contact_email)}
                </div>
              </div>
            )}

            {/* Contrato */}
            {(localClient.contract_start_date || localClient.contract_end_date) && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Contrato
                </h3>
                <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                  {field('Inicio', localClient.contract_start_date)}
                  {field('Vencimiento', localClient.contract_end_date)}
                </div>
              </div>
            )}

            {/* Sedes */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Sedes ({localClient.client_locations.length})
                </h3>
                <button
                  onClick={() => setLocationModal({ open: true, location: null })}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  + Agregar sede
                </button>
              </div>

              {localClient.client_locations.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-lg">
                  Sin sedes registradas
                </p>
              ) : (
                <div className="space-y-2">
                  {localClient.client_locations.map((loc) => (
                    <div
                      key={loc.id}
                      className="flex items-start justify-between p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-gray-800">{loc.name}</p>
                          {loc.risk_level && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${RISK_BADGES[loc.risk_level]}`}
                            >
                              Riesgo {loc.risk_level}
                            </span>
                          )}
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              loc.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {loc.status === 'active' ? 'Activa' : 'Inactiva'}
                          </span>
                        </div>
                        <div className="flex gap-4 mt-1 flex-wrap">
                          {loc.address && <p className="text-xs text-gray-400">{loc.address}</p>}
                          {loc.radiation_type && (
                            <p className="text-xs text-gray-400">
                              {RADIATION_LABELS[loc.radiation_type]}
                            </p>
                          )}
                          {loc.contact_name && (
                            <p className="text-xs text-gray-400">Resp: {loc.contact_name}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-3 shrink-0">
                        <button
                          onClick={() => setLocationModal({ open: true, location: loc })}
                          className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggleLocationStatus(loc)}
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {locationModal.open && (
        <LocationFormModal
          clientId={localClient.id}
          location={locationModal.location}
          onClose={() => setLocationModal({ open: false, location: null })}
          onSuccess={handleLocationSuccess}
        />
      )}
    </>
  );
}
