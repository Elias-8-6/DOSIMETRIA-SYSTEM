import type {
  PackagingCondition,
  ReceptionItemCondition,
} from '../api/receptions.api';

export const PACKAGING_CONDITION_LABELS: Record<PackagingCondition, string> = {
  integro: 'Íntegro',
  danado_leve: 'Dañado leve',
  danado_grave: 'Dañado grave',
};

export const PACKAGING_CONDITION_CLASSES: Record<PackagingCondition, string> = {
  integro: 'bg-green-50 text-green-700 border border-green-200',
  danado_leve: 'bg-amber-50 text-amber-700 border border-amber-200',
  danado_grave: 'bg-rose-50 text-rose-700 border border-rose-200',
};

export const RECEPTION_ITEM_CONDITION_LABELS: Record<ReceptionItemCondition, string> = {
  normal: 'Normal / Conforme',
  danado_fisico: 'Daño físico',
  sello_roto: 'Sello roto',
  contaminado: 'Contaminado',
  perdido: 'Perdido / No llegó',
};

export const RECEPTION_ITEM_CONDITION_CLASSES: Record<ReceptionItemCondition, string> = {
  normal: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  danado_fisico: 'bg-orange-50 text-orange-700 border border-orange-200',
  sello_roto: 'bg-amber-50 text-amber-700 border border-amber-200',
  contaminado: 'bg-rose-100 text-rose-800 border border-rose-300 font-medium',
  perdido: 'bg-gray-100 text-gray-700 border border-gray-200',
};
