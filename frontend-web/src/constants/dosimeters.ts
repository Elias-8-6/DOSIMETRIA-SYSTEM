import type { DosimeterCondition } from '../api/dosimeters.api';

export const CONDITION_LABELS: Record<DosimeterCondition, string> = {
  normal: 'Normal',
  danado: 'Dañado',
  contaminado: 'Contaminado',
  perdido: 'Perdido',
};

export const CONDITIONS: { value: DosimeterCondition; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'danado', label: 'Dañado' },
  { value: 'contaminado', label: 'Contaminado' },
  { value: 'perdido', label: 'Perdido' },
];
