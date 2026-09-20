import type { ReceptionItemCondition } from '../../api/receptions.api';
import {
  RECEPTION_ITEM_CONDITION_CLASSES,
  RECEPTION_ITEM_CONDITION_LABELS,
} from '../../constants/receptions';

export function ReceptionItemConditionBadge({ condition }: { condition: ReceptionItemCondition }) {
  const label = RECEPTION_ITEM_CONDITION_LABELS[condition] ?? condition;
  const classes =
    RECEPTION_ITEM_CONDITION_CLASSES[condition] ?? 'bg-gray-100 text-gray-700 border-gray-200';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${classes}`}>
      {label}
    </span>
  );
}
