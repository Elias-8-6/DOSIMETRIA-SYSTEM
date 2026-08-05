import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type {
  DosimeterDetail,
  DosimeterAssignment,
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
      setHistory(historyRes.items);
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
    } catch {
      showToast('No se pudo actualizar el estado');
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
            <StatusBadge
              active={dosimeter.dosimeter_statuses.code === 'DISPONIBLE'}
              activeLabel={dosimeter.dosimeter_statuses.name}
              inactiveLabel={dosimeter.dosimeter_statuses.name}
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
          {sectionHead('Datos del dosímetro')}
          <div className="grid grid-cols-2 gap-y-4 gap-x-6">
            {field('Tipo', dosimeter.dosimeter_types.name)}
            {field('Tecnología', dosimeter.dosimeter_types.technology)}
            {field('Lote', dosimeter.lot_number)}
            {field('Condición', CONDITION_LABELS[dosimeter.current_condition])}
            {field('Fabricación', formatDate(dosimeter.manufacture_date))}
            {field('Puesta en servicio', formatDate(dosimeter.commissioning_date))}
            {field(
              'Período de uso',
              dosimeter.wear_period_days ? `${dosimeter.wear_period_days} días` : null,
            )}
            {field('Límite máx. de dosis', dosimeter.max_dose_limit?.toString())}
            {field('Último recocido', formatDate(dosimeter.last_annealing_date))}
            {field('Reutilizable', dosimeter.reusable ? 'Sí' : 'No')}
          </div>
          {dosimeter.notes && (
            <div className="mt-4">
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
                    {statuses.map((s) => (
                      <option key={s.id} value={s.code}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button
                  onClick={handleStatusChange}
                  disabled={statusLoading || statusValue === dosimeter.dosimeter_statuses.code}
                >
                  {statusLoading ? '...' : 'Guardar'}
                </Button>
              </div>
            </div>
          )}

          <div>
            {sectionHead('Asignación actual')}
            {openAssignment ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-y-3 gap-x-6">
                  {field('Trabajador', openAssignment.workers.full_name)}
                  {field('Institución', openAssignment.workers.clients.name)}
                  {field('Asignado', formatDate(openAssignment.assigned_at))}
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

      {/* Historial de asignaciones */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-800">
            Historial de asignaciones
            <span className="ml-2 text-xs font-normal text-gray-400">({history.length})</span>
          </h2>
        </div>

        {history.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center">Sin asignaciones registradas</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {history.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-start justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-800">
                      {assignment.workers.full_name}
                    </p>
                    <span className="text-xs text-gray-400">
                      {assignment.workers.clients.name}
                    </span>
                    <StatusBadge
                      active={assignment.status === 'activo'}
                      activeLabel="En campo"
                      inactiveLabel="Devuelto"
                    />
                  </div>
                  <div className="flex gap-4 mt-1 flex-wrap">
                    <p className="text-xs text-gray-400">
                      Asignado: {formatDate(assignment.assigned_at)}
                    </p>
                    {assignment.returned_at && (
                      <p className="text-xs text-gray-400">
                        Devuelto: {formatDate(assignment.returned_at)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
