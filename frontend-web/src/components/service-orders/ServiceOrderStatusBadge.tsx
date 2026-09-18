import type { ServiceOrderStatus } from '../../api/serviceOrders.api';
import { STATUS_CLASSES, STATUS_LABELS } from '../../constants/serviceOrders';

export function ServiceOrderStatusBadge({ status }: { status: ServiceOrderStatus }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
