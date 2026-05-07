import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import type {
  Worker,
  WorkerGender,
  CreateWorkerPayload,
  UpdateWorkerPayload,
} from '../../api/workers.api';
import { createWorker, updateWorker } from '../../api/workers.api.ts';
import { getClients } from '../../api/clients.api';
import type { Client, ClientLocation } from '../../api/clients.api';

interface Props {
  worker?: Worker | null;
  clientId?: string; // si viene pre-fijado (desde detalle de cliente)
  onClose: () => void;
  onSuccess: () => void;
}

const GENDERS: { value: WorkerGender; label: string }[] = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'femenino', label: 'Femenino' },
  { value: 'otro', label: 'Otro' },
];

export function WorkerFormModal({ worker, clientId, onClose, onSuccess }: Props) {
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
  const [selectedLocationId, setSelectedLocationId] = useState(worker?.client_locations?.id ?? '');

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

  // Cargar sedes cuando cambia el cliente seleccionado
  useEffect(() => {
    if (!selectedClientId) {
      setLocations([]);
      setSelectedLocationId('');
      return;
    }
    // Buscar las sedes del cliente seleccionado desde los clientes ya cargados
    const found = clients.find((c) => c.id === selectedClientId);
    if (found) {
      setLocations(found.client_locations);
    }
  }, [selectedClientId, clients]);

  const handleClientChange = (id: string) => {
    setSelectedClientId(id);
    setSelectedLocationId(''); // resetear sede al cambiar cliente
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

  const inputClass = `w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
    focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`;
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
  const sectionHead = (label: string, color: string) => (
    <div className={`flex items-center gap-2 mb-3`}>
      <div className={`w-1 h-4 rounded-full ${color}`} />
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</h3>
    </div>
  );

  return (
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
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <h2 className="text-base font-semibold text-gray-900">
              {isEditing ? 'Editar trabajador' : 'Nuevo trabajador'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none cursor-pointer"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
          {/* Identificación */}
          <div>
            {sectionHead('Identificación', 'bg-emerald-500')}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelClass}>Nombre completo *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Juan Pérez"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Cédula / Documento</label>
                <input
                  type="text"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="8-123-456"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Código de empleado</label>
                <input
                  type="text"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  placeholder="EMP-001"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Datos personales */}
          <div>
            {sectionHead('Datos personales', 'bg-blue-400')}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Sexo</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as WorkerGender | '')}
                  className={inputClass}
                >
                  <option value="">Seleccionar</option>
                  {GENDERS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Fecha de nacimiento</label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className={inputClass}
                />
              </div>
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
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="trabajador@institucion.com"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Datos laborales */}
          <div>
            {sectionHead('Datos laborales', 'bg-violet-400')}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Ocupación</label>
                <input
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="Radiólogo"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Fecha de inicio en dosimetría</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={inputClass}
                />
              </div>

              {/* Cliente — solo al crear y si no viene fijo */}
              {!isEditing && !clientId && (
                <div className="col-span-2">
                  <label className={labelClass}>Institución *</label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => handleClientChange(e.target.value)}
                    required
                    className={inputClass}
                  >
                    <option value="">Seleccionar institución</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sede */}
              {(selectedClientId || clientId) && (
                <div className={!isEditing && !clientId ? 'col-span-2' : 'col-span-2'}>
                  <label className={labelClass}>Sede</label>
                  <select
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Sin sede asignada</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
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
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear trabajador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
