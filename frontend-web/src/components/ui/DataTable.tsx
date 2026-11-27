import type { ReactNode } from 'react';

/** Clases de celda compartidas — antes divergían entre módulos (py-3 vs py-4). */
export const TH_CLASS = 'text-left px-4 py-3 font-medium text-gray-600';
export const TD_CLASS = 'px-4 py-3';

interface DataTableProps {
  children: ReactNode;
  className?: string;
}

export function DataTable({ children, className = '' }: DataTableProps) {
  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col min-h-0 ${className}`}
    >
      {children}
    </div>
  );
}

export function TableScrollContainer({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex-1 min-h-0 overflow-auto ${className}`}>
      {children}
    </div>
  );
}

export function TableStatusRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center px-4 py-12 text-gray-400 text-sm">
        {children}
      </td>
    </tr>
  );
}
