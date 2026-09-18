import type {
  ServiceType,
  ServiceOrderStatus,
  Priority,
  RequestedAction,
} from '../api/serviceOrders.api';

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  lectura_dosis: 'Lectura de dosis',
  lectura_y_recarga: 'Lectura y recarga',
  mantenimiento: 'Mantenimiento',
  calibracion: 'Calibración',
};

export const STATUS_LABELS: Record<ServiceOrderStatus, string> = {
  PENDING: 'Pendiente',
  RECEIVED: 'Recibida',
  IN_PROCESS: 'En proceso',
  QC_REVIEW: 'Revisión QC',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

export const STATUS_CLASSES: Record<ServiceOrderStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-600',
  RECEIVED: 'bg-blue-100 text-blue-700',
  IN_PROCESS: 'bg-amber-100 text-amber-700',
  QC_REVIEW: 'bg-violet-100 text-violet-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  normal: 'Normal',
  urgente: 'Urgente',
  critica: 'Crítica',
};

export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'urgente', label: 'Urgente' },
  { value: 'critica', label: 'Crítica' },
];

export const REQUESTED_ACTIONS: { value: RequestedAction; label: string }[] = [
  { value: 'lectura', label: 'Lectura' },
  { value: 'limpieza', label: 'Limpieza' },
  { value: 'recarga', label: 'Recarga' },
  { value: 'inspeccion', label: 'Inspección' },
];
