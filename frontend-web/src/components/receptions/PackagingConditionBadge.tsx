import type { PackagingCondition } from '../../api/receptions.api';
import {
  PACKAGING_CONDITION_CLASSES,
  PACKAGING_CONDITION_LABELS,
} from '../../constants/receptions';

export function PackagingConditionBadge({ condition }: { condition: PackagingCondition }) {
  const label = PACKAGING_CONDITION_LABELS[condition] ?? condition;
  const classes =
    PACKAGING_CONDITION_CLASSES[condition] ?? 'bg-gray-100 text-gray-700 border-gray-200';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      {label}
    </span>
  );
}
