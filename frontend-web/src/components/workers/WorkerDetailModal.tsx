import { useState } from 'react';
import type { WorkerDetail, WorkerStatus } from '../../api/workers.api';
import { updateWorkerStatus } from '../../api/workers.api';

interface Props {
  worker: WorkerDetail;
  onClose: () => void;
  onUpdate: (worker: WorkerDetail) => void;
  onEdit: (worker: WorkerDetail) => void;
}

const GENDER_LABELS: Record<string, string> = {
  masculino: 'Masculino',
  femenino: 'Femenino',
  otro: 'Otro',
};

export function WorkerDetailModal({ worker, onClose, onUpdate, onEdit }: Props) {
  const [localWorker, setLocalWorker] = useState<WorkerDetail>(worker);
  const [statusLoading, setStatusLoading] = useState(false);

  const handleToggleStatus = async () => {
    setStatusLoading(true);
    try {
      const newStatus: WorkerStatus = localWorker.status === 'active' ? 'inactive' : 'active';
      await updateWorkerStatus(localWorker.id, newStatus);
      const updated = { ...localWorker, status: newStatus };
      setLocalWorker(updated);
      onUpdate(updated);
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
    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{label}</h3>
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
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <div>
              <h2 className="text-base font-semibold text-gray-900">{localWorker.full_name}</h2>
              {localWorker.clients && (
                <p className="text-xs text-gray-400 mt-0.5">{localWorker.clients.name}</p>
              )}
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                localWorker.status === 'active'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {localWorker.status === 'active' ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(localWorker)}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors cursor-pointer"
            >
              Editar
            </button>
            <button
              onClick={handleToggleStatus}
              disabled={statusLoading}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer disabled:cursor-not-allowed ${
                localWorker.status === 'active'
                  ? 'text-red-600 border-red-200 hover:bg-red-50'
                  : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              {statusLoading ? '...' : localWorker.status === 'active' ? 'Desactivar' : 'Activar'}
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
          {/* Identificación */}
          <div>
            {sectionHead('Identificación')}
            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
              {field('Documento', localWorker.document_number)}
              {field('Código empleado', localWorker.employee_code)}
            </div>
          </div>

          {/* Datos personales */}
          {(localWorker.gender ||
            localWorker.date_of_birth ||
            localWorker.phone ||
            localWorker.email) && (
            <div>
              {sectionHead('Datos personales')}
              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                {field('Sexo', localWorker.gender ? GENDER_LABELS[localWorker.gender] : null)}
                {field('Fecha nacimiento', localWorker.date_of_birth)}
                {field('Teléfono', localWorker.phone)}
                {field('Email', localWorker.email)}
              </div>
            </div>
          )}

          {/* Datos laborales */}
          <div>
            {sectionHead('Datos laborales')}
            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
              {field('Institución', localWorker.clients?.name)}
              {field('Sede', localWorker.client_locations?.name)}
              {field('Ocupación', localWorker.occupation)}
              {field('Inicio en dosimetría', localWorker.start_date)}
            </div>
          </div>

          {/* Historial de dosímetros */}
          <div>
            <div className="flex items-center justify-between mb-3">
              {sectionHead(
                `Historial de dosímetros (${localWorker.dosimeter_assignments?.length ?? 0})`,
              )}
            </div>

            {!localWorker.dosimeter_assignments?.length ? (
              <p className="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-lg">
                Sin asignaciones de dosímetros
              </p>
            ) : (
              <div className="space-y-2">
                {localWorker.dosimeter_assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-start justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-800">
                          {assignment.dosimeters.serial_number}
                        </p>
                        {assignment.dosimeters.internal_code && (
                          <span className="text-xs text-gray-400">
                            ({assignment.dosimeters.internal_code})
                          </span>
                        )}
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            assignment.status === 'activo'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {assignment.status === 'activo' ? 'En campo' : 'Devuelto'}
                        </span>
                      </div>
                      <div className="flex gap-4 mt-1 flex-wrap">
                        <p className="text-xs text-gray-400">
                          {assignment.dosimeters.dosimeter_types.name}
                        </p>
                        <p className="text-xs text-gray-400">Asignado: {assignment.assigned_at}</p>
                        {assignment.returned_at && (
                          <p className="text-xs text-gray-400">
                            Devuelto: {assignment.returned_at}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
