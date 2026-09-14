import type { DosimeterStatusCode } from '../../api/dosimeters.api';

interface DosimeterStatusBadgeProps {
  code: DosimeterStatusCode | string;
  name?: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DISPONIBLE: {
    label: 'Disponible',
    className: 'bg-emerald-100 text-emerald-700',
  },
  ASIGNADO: {
    label: 'Asignado',
    className: 'bg-blue-100 text-blue-700',
  },
  EN_LAB: {
    label: 'En laboratorio',
    className: 'bg-amber-100 text-amber-800',
  },
  EN_LECTURA: {
    label: 'En lectura',
    className: 'bg-purple-100 text-purple-700',
  },
  PROCESADO: {
    label: 'Procesado',
    className: 'bg-cyan-100 text-cyan-800',
  },
  ENTREGADO: {
    label: 'Entregado',
    className: 'bg-indigo-100 text-indigo-700',
  },
  BAJA: {
    label: 'Baja',
    className: 'bg-gray-200 text-gray-700',
  },
  INCIDENTE: {
    label: 'Incidente',
    className: 'bg-red-100 text-red-700',
  },
};

export function DosimeterStatusBadge({ code, name }: DosimeterStatusBadgeProps) {
  const config = STATUS_CONFIG[code] ?? {
    label: name || code,
    className: 'bg-gray-100 text-gray-600',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {name || config.label}
    </span>
  );
}
