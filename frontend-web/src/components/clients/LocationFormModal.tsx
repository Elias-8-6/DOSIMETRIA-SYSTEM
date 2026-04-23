import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import type {
  ClientLocation,
  CreateLocationPayload,
  RadiationType,
  RiskLevel,
} from '../../api/clients.api.ts';
import { createClientLocation, updateClientLocation } from '../../api/clients.api.ts';

interface Props {
  clientId: string;
  location?: ClientLocation | null;
  onClose: () => void;
  onSuccess: (location: ClientLocation) => void;
}

const RADIATION_TYPES: { value: RadiationType; label: string }[] = [
  { value: 'rayos_x', label: 'Rayos X' },
  { value: 'gamma', label: 'Gamma' },
  { value: 'neutrones', label: 'Neutrones' },
  { value: 'beta', label: 'Beta' },
  { value: 'mixta', label: 'Mixta' },
  { value: 'otro', label: 'Otro' },
];

const RISK_LEVELS: { value: RiskLevel; label: string }[] = [
  { value: 'bajo', label: 'Bajo' },
  { value: 'medio', label: 'Medio' },
  { value: 'alto', label: 'Alto' },
];

export function LocationFormModal({ clientId, location, onClose, onSuccess }: Props) {
  const isEditing = !!location;

  const [name, setName] = useState(location?.name ?? '');
  const [address, setAddress] = useState(location?.address ?? '');
  const [phone, setPhone] = useState(location?.phone ?? '');
  const [contactName, setContactName] = useState(location?.contact_name ?? '');
  const [radiationType, setRadiationType] = useState<RadiationType | ''>(
    location?.radiation_type ?? '',
  );
  const [riskLevel, setRiskLevel] = useState<RiskLevel | ''>(location?.risk_level ?? '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setName(location?.name ?? '');
    setAddress(location?.address ?? '');
    setPhone(location?.phone ?? '');
    setContactName(location?.contact_name ?? '');
    setRadiationType(location?.radiation_type ?? '');
    setRiskLevel(location?.risk_level ?? '');
  }, [location]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload: CreateLocationPayload = { name };
      if (address) payload.address = address;
      if (phone) payload.phone = phone;
      if (contactName) payload.contact_name = contactName;
      if (radiationType) payload.radiation_type = radiationType as RadiationType;
      if (riskLevel) payload.risk_level = riskLevel as RiskLevel;

      let result: ClientLocation;
      if (isEditing && location) {
        result = await updateClientLocation(clientId, location.id, payload);
      } else {
        result = await createClientLocation(clientId, payload);
      }

      onSuccess(result);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e?.response?.data?.message ?? 'Error al guardar la sede';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`;
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-lg w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            {isEditing ? 'Editar sede' : 'Nueva sede'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none cursor-pointer"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className={labelClass}>Nombre de la sede *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Área de Rayos X"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Dirección</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Piso 1, Ala Norte"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Teléfono</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+507 6000-0000"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Responsable de dosimetría</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Nombre del responsable"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Tipo de radiación</label>
              <select
                value={radiationType}
                onChange={(e) => setRadiationType(e.target.value as RadiationType | '')}
                className={inputClass}
              >
                <option value="">Seleccionar</option>
                {RADIATION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Nivel de riesgo</label>
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value as RiskLevel | '')}
                className={inputClass}
              >
                <option value="">Seleccionar</option>
                {RISK_LEVELS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear sede'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
