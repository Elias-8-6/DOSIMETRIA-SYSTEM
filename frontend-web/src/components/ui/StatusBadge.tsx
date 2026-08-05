interface StatusBadgeProps {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}

/**
 * Badge de estado compartido. Antes había 3 variantes de color distintas
 * (green-50/700 en Usuarios, emerald-100/700 en Clientes/Trabajadores, y un
 * color inline por hex en UserDetailPage) para el mismo concepto visual.
 */
export function StatusBadge({
  active,
  activeLabel = 'Activo',
  inactiveLabel = 'Inactivo',
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
        active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
      }`}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}
