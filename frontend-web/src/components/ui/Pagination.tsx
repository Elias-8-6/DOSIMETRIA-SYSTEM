interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/** Paginación compartida — antes tenía dos estilos visuales distintos entre Usuarios y el resto. */
export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
      <p className="text-sm text-gray-500">
        Página {page} de {totalPages}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600
                     hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600
                     hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
