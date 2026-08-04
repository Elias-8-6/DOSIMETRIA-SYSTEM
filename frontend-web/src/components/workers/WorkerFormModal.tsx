import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import type {
  Worker,
  WorkerGender,
  CreateWorkerPayload,
  UpdateWorkerPayload,
} from '../../api/workers.api';
import { createWorker, updateWorker } from '../../api/workers.api';
import { getClients, getClient } from '../../api/clients.api';
import type { Client, ClientLocation } from '../../api/clients.api';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

interface Props {
  worker?: Worker | null;
  clientId?: string;
  clientLocationId?: string; // sede pre-fijada (desde detalle de cliente)
  onClose: () => void;
  onSuccess: () => void;
}

const GENDERS: { value: WorkerGender; label: string }[] = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'femenino', label: 'Femenino' },
  { value: 'otro', label: 'Otro' },
];

const sectionHead = (label: string, color: string) => (
  <div className="flex items-center gap-2 mb-3">
    <div className={`w-1 h-4 rounded-full ${color}`} />
    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</h3>
  </div>
);

export function WorkerFormModal({ worker, clientId, clientLocationId, onClose, onSuccess }: Props) {
  const isEditing = !!worker;

  // Identificación
  const [fullName, setFullName] = useState(worker?.full_name ?? '');
  const [documentNumber, setDocumentNumber] = useState(worker?.document_number ?? '');
  const [employeeCode, setEmployeeCode] = useState(worker?.employee_code ?? '');

  // Datos personales
  const [gender, setGender] = useState<WorkerGender | ''>(worker?.gender ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(worker?.date_of_birth ?? '');
  const [phone, setPhone] = useState(worker?.phone ?? '');
  const [email, setEmail] = useState(worker?.email ?? '');

  // Datos laborales
  const [occupation, setOccupation] = useState(worker?.occupation ?? '');
  const [startDate, setStartDate] = useState(worker?.start_date ?? '');
  const [selectedClientId, setSelectedClientId] = useState(clientId ?? worker?.clients?.id ?? '');
  const [selectedLocationId, setSelectedLocationId] = useState(
    clientLocationId ?? worker?.client_locations?.id ?? '',
  );

  // Datos para los selects
  const [clients, setClients] = useState<Client[]>([]);
  const [locations, setLocations] = useState<ClientLocation[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cargar clientes al montar (solo si no viene clientId fijo)
  useEffect(() => {
    if (clientId) return;
    getClients({ limit: 100 })
      .then((res) => setClients(res.items))
      .catch(() => {});
  }, [clientId]);

  // Cuando viene clientId fijo, cargar sus sedes directamente
  useEffect(() => {
    if (!clientId) return;
    getClient(clientId)
      .then((c) => setLocations(c.client_locations))
      .catch(() => {});
  }, [clientId]);

  // Cargar sedes cuando cambia el cliente seleccionado (sin clientId fijo).
  // getClients() (listado) no trae objetos de sede reales, solo el conteo
  // — hay que pedir el detalle del cliente para obtener las sedes.
  useEffect(() => {
    if (clientId) return; // ya se cargaron arriba
    if (!selectedClientId) {
      setLocations([]);
      setSelectedLocationId('');
      return;
    }
    getClient(selectedClientId)
      .then((c) => setLocations(c.client_locations))
      .catch(() => setLocations([]));
  }, [selectedClientId, clientId]);

  const handleClientChange = (id: string) => {
    setSelectedClientId(id);
    setSelectedLocationId('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isEditing && worker) {
        const payload: UpdateWorkerPayload = {};
        if (fullName !== worker.full_name) payload.full_name = fullName;
        if (documentNumber !== (worker.document_number ?? ''))
          payload.document_number = documentNumber;
        if (employeeCode !== (worker.employee_code ?? '')) payload.employee_code = employeeCode;
        if (gender !== (worker.gender ?? '')) payload.gender = gender as WorkerGender;
        if (dateOfBirth !== (worker.date_of_birth ?? '')) payload.date_of_birth = dateOfBirth;
        if (phone !== (worker.phone ?? '')) payload.phone = phone;
        if (email !== (worker.email ?? '')) payload.email = email;
        if (occupation !== (worker.occupation ?? '')) payload.occupation = occupation;
        if (startDate !== (worker.start_date ?? '')) payload.start_date = startDate;
        if (selectedLocationId !== (worker.client_locations?.id ?? ''))
          payload.client_location_id = selectedLocationId || undefined;

        if (Object.keys(payload).length === 0) {
          setError('No hay cambios para guardar');
          return;
        }
        await updateWorker(worker.id, payload);
      } else {
        const payload: CreateWorkerPayload = {
          client_id: selectedClientId,
          full_name: fullName,
        };
        if (documentNumber) payload.document_number = documentNumber;
        if (employeeCode) payload.employee_code = employeeCode;
        if (gender) payload.gender = gender as WorkerGender;
        if (dateOfBirth) payload.date_of_birth = dateOfBirth;
        if (phone) payload.phone = phone;
        if (email) payload.email = email;
        if (occupation) payload.occupation = occupation;
        if (startDate) payload.start_date = startDate;
        if (selectedLocationId) payload.client_location_id = selectedLocationId;
        await createWorker(payload);
      }

      onClose();
      onSuccess();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e?.response?.data?.message ?? 'Error al guardar el trabajador';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={isEditing ? 'Editar trabajador' : 'Nuevo trabajador'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
        {/* Identificación */}
        <div>
          {sectionHead('Identificación', 'bg-emerald-500')}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input
                label="Nombre completo"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Juan Pérez"
                accent="emerald"
              />
            </div>
            <Input
              label="Cédula / Documento"
              type="text"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              required={!isEditing}
              placeholder="8-123-456"
              accent="emerald"
            />
            <Input
              label="Código de empleado"
              type="text"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              placeholder="EMP-001"
              accent="emerald"
            />
          </div>
        </div>

        {/* Datos personales */}
        <div>
          {sectionHead('Datos personales', 'bg-blue-400')}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Sexo"
              value={gender}
              onChange={(e) => setGender(e.target.value as WorkerGender | '')}
              accent="emerald"
            >
              <option value="">Seleccionar</option>
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </Select>
            <Input
              label="Fecha de nacimiento"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              accent="emerald"
            />
            <Input
              label="Teléfono"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required={!isEditing}
              placeholder="+507 6000-0000"
              accent="emerald"
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required={!isEditing}
              placeholder="trabajador@institucion.com"
              accent="emerald"
            />
          </div>
        </div>

        {/* Datos laborales */}
        <div>
          {sectionHead('Datos laborales', 'bg-violet-400')}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Ocupación"
              type="text"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="Radiólogo"
              accent="emerald"
            />
            <Input
              label="Fecha de inicio en dosimetría"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required={!isEditing}
              accent="emerald"
            />

            {/* Cliente — solo al crear y si no viene fijo */}
            {!isEditing && !clientId && (
              <div className="col-span-2">
                <Select
                  label="Institución"
                  value={selectedClientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                  required
                  accent="emerald"
                >
                  <option value="">Seleccionar institución</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {/* Sede — se oculta si viene clientLocationId fijo. El backend
                la exige al crear (CreateWorkerDto.client_location_id). */}
            {!clientLocationId && (selectedClientId || clientId) && (
              <div className="col-span-2">
                <Select
                  label="Sede"
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  required={!isEditing}
                  accent="emerald"
                >
                  <option value="">{isEditing ? 'Sin sede asignada' : 'Seleccionar sede'}</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button variant="secondary" accent="emerald" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" accent="emerald" disabled={loading}>
            {loading ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear trabajador'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
