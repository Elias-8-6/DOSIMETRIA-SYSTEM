import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import type {
  ClientLocation,
  CreateLocationPayload,
  RadiationType,
  RiskLevel,
} from '../../api/clients.api.ts';
import { createClientLocation, updateClientLocation } from '../../api/clients.api.ts';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.id]);

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

  return (
    <Modal title={isEditing ? 'Editar sede' : 'Nueva sede'} onClose={onClose} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        <Input
          label="Nombre del Departamento"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Área de Rayos X"
        />

        <Input
          label="Dirección"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Piso 1, Ala Norte"
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Teléfono"
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+507 6000-0000"
          />
          <Input
            label="Nombre del contacto"
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Nombre del responsable"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Tipo de radiación"
            value={radiationType}
            onChange={(e) => setRadiationType(e.target.value as RadiationType | '')}
          >
            <option value="">Seleccionar</option>
            {RADIATION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          <Select
            label="Nivel de riesgo"
            value={riskLevel}
            onChange={(e) => setRiskLevel(e.target.value as RiskLevel | '')}
          >
            <option value="">Seleccionar</option>
            {RISK_LEVELS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
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
            {loading ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear sede'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
