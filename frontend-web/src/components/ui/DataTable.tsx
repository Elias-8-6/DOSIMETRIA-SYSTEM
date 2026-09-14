import type { ReactNode } from 'react';

/** Clases de celda compartidas — antes divergían entre módulos (py-3 vs py-4). */
export const TH_CLASS = 'text-left px-4 py-3 font-medium text-gray-600';
export const TD_CLASS = 'px-4 py-3';

export function DataTable({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">{children}</div>
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
