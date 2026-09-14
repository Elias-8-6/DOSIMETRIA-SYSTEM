import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type {
  DosimeterDetail,
  DosimeterAssignment,
  DosimeterReading,
  ContaminationCheck,
  DosimeterCondition,
  DosimeterStatusCode,
} from '../../api/dosimeters.api';
import { getDosimeter, getDosimeterHistory, updateDosimeterStatus } from '../../api/dosimeters.api';
import type { DosimeterStatus, DosimeterType } from '../../api/catalogs.api';
import { getDosimeterStatuses, getDosimeterTypes } from '../../api/catalogs.api';
import { DosimeterFormModal } from '../../components/dosimeters/DosimeterFormModal';
import { AssignDosimeterModal } from '../../components/dosimeters/AssignDosimeterModal';
import { ReturnDosimeterModal } from '../../components/dosimeters/ReturnDosimeterModal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DosimeterStatusBadge } from '../../components/ui/DosimeterStatusBadge';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { formatDate } from '../../utils/date';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

const CONDITION_LABELS: Record<DosimeterCondition, string> = {
  normal: 'Normal',
  danado: 'Dañado',
  contaminado: 'Contaminado',
  perdido: 'Perdido',
};

export default function DosimeterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { showToast } = useToast();

  const [dosimeter, setDosimeter] = useState<DosimeterDetail | null>(null);
  const [history, setHistory] = useState<DosimeterAssignment[]>([]);
  const [readings, setReadings] = useState<DosimeterReading[]>([]);
  const [contaminations, setContaminations] = useState<ContaminationCheck[]>([]);
  const [activeTab, setActiveTab] = useState<'assignments' | 'readings' | 'contaminations'>('assignments');
  const [statuses, setStatuses] = useState<DosimeterStatus[]>([]);
  const [types, setTypes] = useState<DosimeterType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editModal, setEditModal] = useState(false);
  const [editKey, setEditKey] = useState(0);
  const [assignModal, setAssignModal] = useState(false);
  const [returnModal, setReturnModal] = useState(false);
  const [statusValue, setStatusValue] = useState<DosimeterStatusCode | ''>('');
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const [detail, historyRes] = await Promise.all([getDosimeter(id), getDosimeterHistory(id)]);
      setDosimeter(detail);
      setHistory(historyRes.assignments || historyRes.items || []);
      setReadings(historyRes.readings || []);
      setContaminations(historyRes.contaminations || []);
      setStatusValue(detail.dosimeter_statuses.code);
    } catch {
      setError('No se pudo cargar el dosímetro');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    getDosimeterStatuses()
      .then(setStatuses)
      .catch(() => {});
    getDosimeterTypes()
      .then(setTypes)
      .catch(() => {});
  }, []);

  const handleStatusChange = async () => {
    if (!dosimeter || !statusValue || statusValue === dosimeter.dosimeter_statuses.code) return;
    setStatusLoading(true);
    try {
      await updateDosimeterStatus(dosimeter.id, statusValue);
      showToast('Estado actualizado correctamente');
      fetchAll();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e?.response?.data?.message;
      const errorMsg = Array.isArray(msg) ? msg.join(', ') : msg ?? 'No se pudo actualizar el estado';
      showToast(errorMsg);
    } finally {
      setStatusLoading(false);
    }
  };

  const field = (label: string, value: string | null | undefined) =>
    value ? (
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-800 mt-0.5">{value}</p>
      </div>
    ) : null;

  const sectionHead = (label: string) => (
    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{label}</h2>
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-20 text-gray-400 text-sm">
        Cargando...
      </div>
    );
  }

  if (error || !dosimeter) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">{error || 'Dosímetro no encontrado'}</p>
        <button
          onClick={() => navigate('/dosimeters')}
          className="mt-4 text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
        >
          ← Volver a dosímetros
        </button>
      </div>
    );
  }

  const openAssignment = dosimeter.dosimeter_assignments[0] ?? null;
  const canAssign = !openAssignment && dosimeter.dosimeter_statuses.code === 'DISPONIBLE';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => navigate('/dosimeters')}
            className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer mb-2 block"
          >
            ← Volver a dosímetros
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{dosimeter.serial_number}</h1>
            {dosimeter.internal_code && (
              <span className="text-sm text-gray-400">{dosimeter.internal_code}</span>
            )}
            <DosimeterStatusBadge
              code={dosimeter.dosimeter_statuses.code}
              name={dosimeter.dosimeter_statuses.name}
            />
          </div>
        </div>
        {hasPermission('dosimeters', 'update') && (
          <button
            onClick={() => {
              setEditKey((k) => k + 1);
              setEditModal(true);
            }}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 border bg-gray-100 border-gray-300 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
          >
            Editar
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Datos del dosímetro */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between">
            {sectionHead('Datos del dosímetro')}
            {dosimeter.photo_url && (
              <a
                href={dosimeter.photo_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-2"
              >
                Ver foto en tamaño original ↗
              </a>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-5">
            {dosimeter.photo_url && (
              <div className="w-28 h-28 shrink-0 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                <img
                  src={dosimeter.photo_url}
                  alt={`Dosímetro ${dosimeter.serial_number}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            <div className="flex-1 grid grid-cols-2 gap-y-4 gap-x-6">
              {field('Tipo', dosimeter.dosimeter_types.name)}
              {field('Tecnología', dosimeter.dosimeter_types.technology)}
              {field('Fabricante', dosimeter.manufacturer)}
              {field('Modelo', dosimeter.model)}
              {field('Lote', dosimeter.lot_number)}
              {field('Condición', CONDITION_LABELS[dosimeter.current_condition])}
              {field('Fabricación', formatDate(dosimeter.manufacture_date))}
              {field('Puesta en servicio', formatDate(dosimeter.commissioning_date))}
              {field(
                'Período de uso',
                dosimeter.wear_period_days ? `${dosimeter.wear_period_days} días` : null,
              )}
              {field('Límite máx. de dosis', dosimeter.max_dose_limit ? `${dosimeter.max_dose_limit} mSv` : null)}
              {field('Último recocido', formatDate(dosimeter.last_annealing_date))}
              {field('Reutilizable', dosimeter.reusable ? 'Sí' : 'No')}
            </div>
          </div>
          {dosimeter.notes && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">Notas</p>
              <p className="text-sm text-gray-800 mt-0.5">{dosimeter.notes}</p>
            </div>
          )}
        </div>

        {/* Estado y asignación actual */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
          {hasPermission('dosimeters', 'update') && (
            <div>
              {sectionHead('Cambiar estado')}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select
                    label=""
                    value={statusValue}
                    onChange={(e) => setStatusValue(e.target.value as DosimeterStatusCode)}
                  >
                    {statuses.map((s) => {
                      const isAsignado = s.code === 'ASIGNADO';
                      const isDisponibleBlocked = !!openAssignment && s.code === 'DISPONIBLE';
                      const disabled = isAsignado || isDisponibleBlocked;
                      return (
                        <option key={s.id} value={s.code} disabled={disabled}>
                          {s.name}
                          {isAsignado ? ' (Vía Asignar)' : isDisponibleBlocked ? ' (Requiere registrar devolución)' : ''}
                        </option>
                      );
                    })}
                  </Select>
                </div>
                <Button
                  onClick={handleStatusChange}
                  disabled={
                    statusLoading ||
                    statusValue === dosimeter.dosimeter_statuses.code ||
                    statusValue === 'ASIGNADO' ||
                    (!!openAssignment && statusValue === 'DISPONIBLE')
                  }
                >
                  {statusLoading ? '...' : 'Guardar'}
                </Button>
              </div>
              {openAssignment && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 mt-2">
                  Este dosímetro tiene una asignación activa en campo. Para marcarlo como disponible, registre su devolución en la sección «Asignación actual».
                </p>
              )}
            </div>
          )}

          <div>
            {sectionHead('Asignación actual')}
            {openAssignment ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-y-3 gap-x-6">
                  {field('Trabajador', openAssignment.workers.full_name)}
                  {field('Institución', openAssignment.workers.clients.name)}
                  {field('Sede / Ubicación', openAssignment.workers.client_locations?.name)}
                  {field('Asignado', formatDate(openAssignment.assigned_at))}
                  {field('Responsable', openAssignment.users?.full_name)}
                </div>
                {hasPermission('assignments', 'update') && (
                  <Button variant="danger" onClick={() => setReturnModal(true)}>
                    Devolver
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">Sin asignación activa</p>
                {canAssign && hasPermission('assignments', 'create') && (
                  <Button onClick={() => setAssignModal(true)}>Asignar</Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Historial Integral con Pestañas */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Navegación de pestañas */}
        <div className="px-5 border-b border-gray-200 bg-gray-50 flex gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('assignments')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'assignments'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Historial de asignaciones ({history.length})
          </button>
          <button
            onClick={() => setActiveTab('readings')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'readings'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Lecturas de dosis ({readings.length})
          </button>
          <button
            onClick={() => setActiveTab('contaminations')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'contaminations'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Control de contaminación ({contaminations.length})
          </button>
        </div>

        {/* Pestaña: Asignaciones */}
        {activeTab === 'assignments' && (
          <div>
            {history.length === 0 ? (
              <p className="text-sm text-gray-400 py-10 text-center">Sin asignaciones registradas</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {history.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="p-5 hover:bg-gray-50 transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">
                          {assignment.workers.full_name}
                        </p>
                        <span className="text-xs text-gray-500">
                          {assignment.workers.clients.name}
                          {assignment.workers.client_locations?.name
                            ? ` · ${assignment.workers.client_locations.name}`
                            : ''}
                        </span>
                      </div>
                      <StatusBadge
                        active={assignment.status === 'activo'}
                        activeLabel="En campo"
                        inactiveLabel="Devuelto"
                      />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-500">
                      <div>
                        <span className="text-gray-400">Asignado: </span>
                        {formatDate(assignment.assigned_at)}
                      </div>
                      <div>
                        <span className="text-gray-400">Devuelto: </span>
                        {formatDate(assignment.returned_at)}
                      </div>
                      {assignment.users && (
                        <div className="col-span-2">
                          <span className="text-gray-400">Registrado por: </span>
                          {assignment.users.full_name}
                        </div>
                      )}
                    </div>
                    {assignment.notes && (
                      <div className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded p-2 mt-1">
                        <span className="font-medium text-gray-700">Nota: </span>
                        {assignment.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pestaña: Lecturas de Dosis */}
        {activeTab === 'readings' && (
          <div className="overflow-x-auto">
            {readings.length === 0 ? (
              <p className="text-sm text-gray-400 py-10 text-center">
                Sin lecturas de dosis registradas para este dosímetro
              </p>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3">Fecha lectura</th>
                    <th className="px-5 py-3">Período de uso</th>
                    <th className="px-5 py-3">Dosis medida</th>
                    <th className="px-5 py-3">Hp(10) / Hp(0.07)</th>
                    <th className="px-5 py-3">Equipo</th>
                    <th className="px-5 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {readings.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900">{formatDate(r.read_at)}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        {r.period_start || r.period_end
                          ? `${formatDate(r.period_start)} – ${formatDate(r.period_end)}`
                          : '—'}
                      </td>
                      <td className="px-5 py-3 font-semibold text-gray-900">
                        {r.measured_dose} {r.dose_unit}
                        {r.uncertainty != null && (
                          <span className="text-xs font-normal text-gray-400 ml-1">
                            ± {r.uncertainty}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-600 text-xs">
                        <div>Hp(10): {r.hp10 != null ? `${r.hp10} mSv` : '—'}</div>
                        <div>Hp(0.07): {r.hp007 != null ? `${r.hp007} mSv` : '—'}</div>
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        {r.equipment?.name ?? '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            r.reading_status === 'valido'
                              ? 'bg-green-100 text-green-800'
                              : r.reading_status === 'sospechoso'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {r.reading_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Pestaña: Control de Contaminación */}
        {activeTab === 'contaminations' && (
          <div className="overflow-x-auto">
            {contaminations.length === 0 ? (
              <p className="text-sm text-gray-400 py-10 text-center">
                Sin chequeos de contaminación registrados para este dosímetro
              </p>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3">Fecha</th>
                    <th className="px-5 py-3">Resultado</th>
                    <th className="px-5 py-3">Medición</th>
                    <th className="px-5 py-3">Inspector</th>
                    <th className="px-5 py-3">Equipo</th>
                    <th className="px-5 py-3">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {contaminations.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900">{formatDate(c.checked_at)}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            c.result === 'libre'
                              ? 'bg-green-100 text-green-800'
                              : c.result === 'contaminado_leve'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {c.result}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-700">
                        {c.measured_value != null ? `${c.measured_value} ${c.unit ?? ''}` : '—'}
                      </td>
                      <td className="px-5 py-3 text-gray-600 text-xs">
                        {c.users?.full_name ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        {c.equipment?.name ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        {c.observations ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modales */}
      {editModal && (
        <DosimeterFormModal
          key={editKey}
          dosimeter={dosimeter}
          types={types}
          onClose={() => setEditModal(false)}
          onSuccess={fetchAll}
        />
      )}

      {assignModal && (
        <AssignDosimeterModal
          dosimeterId={dosimeter.id}
          onClose={() => setAssignModal(false)}
          onSuccess={fetchAll}
        />
      )}

      {returnModal && (
        <ReturnDosimeterModal
          dosimeterId={dosimeter.id}
          onClose={() => setReturnModal(false)}
          onSuccess={fetchAll}
        />
      )}
    </div>
  );
}
