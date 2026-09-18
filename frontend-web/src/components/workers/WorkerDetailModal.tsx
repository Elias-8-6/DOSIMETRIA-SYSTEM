import { useState } from 'react';
import type { WorkerDetail, WorkerStatus } from '../../api/workers.api';
import { updateWorkerStatus } from '../../api/workers.api';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { DosimeterStatusBadge } from '../ui/DosimeterStatusBadge';
import { Field } from '../ui/Field';
import { SectionHead } from '../ui/SectionHead';
import { useSortedAssignments } from '../../hooks/useSortedAssignments';
import { formatDate } from '../../utils/date';

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
  const [confirmingStatus, setConfirmingStatus] = useState(false);

  const sortedAssignments = useSortedAssignments(localWorker.dosimeter_assignments);

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
      setConfirmingStatus(false);
    }
  };

  return (
    <>
      <Modal
        title={
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <div>
              <span className="font-semibold text-gray-900">{localWorker.full_name}</span>
              {localWorker.clients && (
                <p className="text-xs font-normal text-gray-400 mt-0.5">
                  {localWorker.clients.name}
                </p>
              )}
            </div>
            <StatusBadge active={localWorker.status === 'active'} />
          </div>
        }
        onClose={onClose}
        headerActions={
          <>
            <Button variant="secondary" accent="emerald" onClick={() => onEdit(localWorker)}>
              Editar
            </Button>
            <Button
              variant={localWorker.status === 'active' ? 'danger' : 'primary'}
              accent="emerald"
              onClick={() => setConfirmingStatus(true)}
              disabled={statusLoading}
            >
              {statusLoading ? '...' : localWorker.status === 'active' ? 'Desactivar' : 'Activar'}
            </Button>
          </>
        }
      >
        <div className="px-6 py-5 space-y-6">
          {/* Identificación */}
          <div>
            <SectionHead label="Identificación" />
            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
              <Field label="Documento" value={localWorker.document_number} />
              <Field label="Código empleado" value={localWorker.employee_code} />
            </div>
          </div>

          {/* Datos personales */}
          {(localWorker.gender ||
            localWorker.date_of_birth ||
            localWorker.phone ||
            localWorker.email) && (
            <div>
              <SectionHead label="Datos personales" />
              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                <Field label="Sexo" value={localWorker.gender ? GENDER_LABELS[localWorker.gender] : null} />
                <Field label="Fecha nacimiento" value={formatDate(localWorker.date_of_birth)} />
                <Field label="Teléfono" value={localWorker.phone} />
                <Field label="Email" value={localWorker.email} />
              </div>
            </div>
          )}

          {/* Datos laborales */}
          <div>
            <SectionHead label="Datos laborales" />
            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
              <Field label="Institución" value={localWorker.clients?.name} />
              <Field label="Sede" value={localWorker.client_locations?.name} />
              <Field label="Ocupación" value={localWorker.occupation} />
              <Field label="Inicio en dosimetría" value={formatDate(localWorker.start_date)} />
            </div>
          </div>

          {/* Historial de dosímetros */}
          <div>
            <SectionHead
              label={`Historial de dosímetros (${sortedAssignments.length})`}
            />

            {!sortedAssignments.length ? (
              <p className="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-lg">
                Sin asignaciones de dosímetros
              </p>
            ) : (
              <div className="space-y-2">
                {sortedAssignments.map((assignment) => (
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
                        <StatusBadge
                          active={assignment.status === 'activo'}
                          activeLabel="En campo"
                          inactiveLabel="Devuelto"
                        />
                        {assignment.dosimeters.dosimeter_statuses && (
                          <DosimeterStatusBadge
                            code={assignment.dosimeters.dosimeter_statuses.code}
                            name={assignment.dosimeters.dosimeter_statuses.name}
                          />
                        )}
                      </div>
                      <div className="flex gap-4 mt-1 flex-wrap">
                        <p className="text-xs text-gray-400">
                          {assignment.dosimeters.dosimeter_types.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          Asignado: {formatDate(assignment.assigned_at)}
                        </p>
                        {assignment.returned_at && (
                          <p className="text-xs text-gray-400">
                            Devuelto: {formatDate(assignment.returned_at)}
                          </p>
                        )}
                      </div>
                      {assignment.notes && (
                        <p className="text-xs text-gray-500 mt-1 italic">
                          Nota: {assignment.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {confirmingStatus && (
        <ConfirmDialog
          title={localWorker.status === 'active' ? 'Desactivar trabajador' : 'Activar trabajador'}
          message={
            localWorker.status === 'active'
              ? `¿Seguro que querés desactivar a ${localWorker.full_name}? Su historial de dosimetría se conserva, pero no podrá recibir nuevas asignaciones mientras esté inactivo.`
              : `¿Reactivar a ${localWorker.full_name}?`
          }
          confirmLabel={localWorker.status === 'active' ? 'Desactivar' : 'Activar'}
          danger={localWorker.status === 'active'}
          loading={statusLoading}
          onConfirm={handleToggleStatus}
          onCancel={() => setConfirmingStatus(false)}
        />
      )}
    </>
  );
}
