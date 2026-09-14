import type { ServiceOrderStatus } from '../../api/serviceOrders.api';
import { Button } from '../ui/Button';

interface Props {
  status: ServiceOrderStatus;
  canUpdate: boolean;
  canCancel: boolean;
  loading: boolean;
  onTransition: (next: Exclude<ServiceOrderStatus, 'CANCELLED'>) => void;
  onCancel: () => void;
}

/** Mismo mapa de transiciones legales que el backend (update-service-order-status.use-case.ts). */
const LEGAL_TRANSITIONS: Record<ServiceOrderStatus, Exclude<ServiceOrderStatus, 'CANCELLED'>[]> = {
  PENDING: ['RECEIVED'],
  RECEIVED: ['IN_PROCESS'],
  IN_PROCESS: ['QC_REVIEW'],
  QC_REVIEW: ['IN_PROCESS', 'COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

const STATUS_LABELS: Record<ServiceOrderStatus, string> = {
  PENDING: 'Pendiente',
  RECEIVED: 'Recibida',
  IN_PROCESS: 'En proceso',
  QC_REVIEW: 'Revisión QC',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

const TERMINAL_STATUSES: ServiceOrderStatus[] = ['COMPLETED', 'CANCELLED'];

export function ServiceOrderStatusControl({
  status,
  canUpdate,
  canCancel,
  loading,
  onTransition,
  onCancel,
}: Props) {
  const nextStatuses = LEGAL_TRANSITIONS[status];
  const isTerminal = TERMINAL_STATUSES.includes(status);

  if (isTerminal || (!canUpdate && !canCancel)) return null;
  if (nextStatuses.length === 0 && !canCancel) return null;

  return (
    <div className="flex gap-2 flex-wrap">
      {canUpdate &&
        nextStatuses.map((next) => (
          <Button key={next} onClick={() => onTransition(next)} disabled={loading}>
            {loading ? '...' : `Marcar como ${STATUS_LABELS[next]}`}
          </Button>
        ))}
      {canCancel && (
        <Button variant="danger" onClick={onCancel} disabled={loading}>
          Cancelar orden
        </Button>
      )}
    </div>
  );
}
