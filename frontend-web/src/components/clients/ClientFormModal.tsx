import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import type {
  Client,
  ClientType,
  CreateClientPayload,
  UpdateClientPayload,
} from '../../api/clients.api.ts';
import { createClient, updateClient } from '../../api/clients.api.ts';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

interface Props {
  client?: Client | null;
  onClose: () => void;
  onSuccess: () => void;
}

const CLIENT_TYPES: { value: ClientType; label: string }[] = [
  { value: 'hospital', label: 'Hospital' },
  { value: 'clinica', label: 'Clínica' },
  { value: 'industria', label: 'Industria' },
  { value: 'investigacion', label: 'Investigación' },
  { value: 'gobierno', label: 'Gobierno' },
  { value: 'otro', label: 'Otro' },
];

export function ClientFormModal({ client, onClose, onSuccess }: Props) {
  const isEditing = !!client;

  const [name, setName] = useState(client?.name ?? '');
  const [contactName, setContactName] = useState(client?.contact_name ?? '');
  const [contactEmail, setContactEmail] = useState(client?.contact_email ?? '');
  const [phone, setPhone] = useState(client?.phone ?? '');
  const [address, setAddress] = useState(client?.address ?? '');
  const [website, setWebsite] = useState(client?.website ?? '');
  const [clientType, setClientType] = useState<ClientType | ''>(client?.client_type ?? '');
  const [contractStartDate, setContractStartDate] = useState(client?.contract_start_date ?? '');
  const [contractEndDate, setContractEndDate] = useState(client?.contract_end_date ?? '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setName(client?.name ?? '');
    setContactName(client?.contact_name ?? '');
    setContactEmail(client?.contact_email ?? '');
    setPhone(client?.phone ?? '');
    setAddress(client?.address ?? '');
    setWebsite(client?.website ?? '');
    setClientType(client?.client_type ?? '');
    setContractStartDate(client?.contract_start_date ?? '');
    setContractEndDate(client?.contract_end_date ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?.id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isEditing && client) {
        const payload: UpdateClientPayload = {};
        if (name !== client.name) payload.name = name;
        if (contactName !== (client.contact_name ?? '')) payload.contact_name = contactName;
        if (contactEmail !== (client.contact_email ?? '')) payload.contact_email = contactEmail;
        if (phone !== (client.phone ?? '')) payload.phone = phone;
        if (address !== (client.address ?? '')) payload.address = address;
        if (website !== (client.website ?? '')) payload.website = website;
        if (clientType !== (client.client_type ?? ''))
          payload.client_type = (clientType as ClientType) || undefined;
        if (contractStartDate !== (client.contract_start_date ?? ''))
          payload.contract_start_date = contractStartDate || undefined;
        if (contractEndDate !== (client.contract_end_date ?? ''))
          payload.contract_end_date = contractEndDate || undefined;

        if (Object.keys(payload).length === 0) {
          setError('No hay cambios para guardar');
          return;
        }
        await updateClient(client.id, payload);
      } else {
        const payload: CreateClientPayload = { name };
        if (contactName) payload.contact_name = contactName;
        if (contactEmail) payload.contact_email = contactEmail;
        if (phone) payload.phone = phone;
        if (address) payload.address = address;
        if (website) payload.website = website;
        if (clientType) payload.client_type = clientType as ClientType;
        if (contractStartDate) payload.contract_start_date = contractStartDate;
        if (contractEndDate) payload.contract_end_date = contractEndDate;
        await createClient(payload);
      }

      onClose();
      onSuccess();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e?.response?.data?.message ?? 'Error al guardar el cliente';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={isEditing ? 'Editar cliente' : 'Nuevo cliente'} onClose={onClose}>
      <form autoComplete="off" onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
        {/* Datos institucionales */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Datos institucionales
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input
                label="Nombre de la institución"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Hospital General San Rafael"
              />
            </div>
            <Select
              label="Tipo de institución"
              value={clientType}
              onChange={(e) => setClientType(e.target.value as ClientType | '')}
            >
              <option value="">Seleccionar tipo</option>
              {CLIENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
            <Input
              label="Teléfono"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+507 6000-0000"
            />
            <div className="col-span-2">
              <Input
                label="Dirección"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Av. Principal 123, Ciudad de Panamá"
              />
            </div>
            <div className="col-span-2">
              <Input
                label="Sitio web"
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://www.institucion.com"
              />
            </div>
          </div>
        </div>

        {/* Contacto */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Contacto
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre del contacto"
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Dr. Martínez"
            />
            <Input
              label="Email de contacto"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="dosimetria@institucion.com"
            />
          </div>
        </div>

        {/* Contrato */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Contrato
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha de inicio"
              type="date"
              value={contractStartDate}
              onChange={(e) => setContractStartDate(e.target.value)}
            />
            <Input
              label="Fecha de vencimiento"
              type="date"
              value={contractEndDate}
              onChange={(e) => setContractEndDate(e.target.value)}
            />
          </div>
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
            {loading ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear cliente'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
