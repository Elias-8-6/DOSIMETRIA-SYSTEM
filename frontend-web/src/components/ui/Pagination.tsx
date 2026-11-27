interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemName?: string;
  hideIfSinglePage?: boolean;
  disabled?: boolean;
}

/** Paginación compartida — fija, responsiva y adaptable a la altura y número de páginas. */
export function Pagination({
  page,
  totalPages,
  onPageChange,
  totalItems,
  itemName = 'registros',
  hideIfSinglePage,
  disabled = false,
}: PaginationProps) {
  const safeTotalPages = Math.max(1, totalPages || 1);

  // Mantener retrocompatibilidad: ocultar si safeTotalPages <= 1 a menos que se hayan pasado totalItems
  const shouldHide =
    hideIfSinglePage !== undefined
      ? hideIfSinglePage && safeTotalPages <= 1
      : safeTotalPages <= 1 && totalItems === undefined;

  if (shouldHide) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-gray-200 bg-white flex-shrink-0 select-none">
      <div className="text-xs sm:text-sm text-gray-500 flex items-center gap-2">
        {totalItems !== undefined && (
          <>
            <span>
              Total: <strong className="font-semibold text-gray-700">{totalItems}</strong> {itemName}
            </span>
            <span className="text-gray-300">|</span>
          </>
        )}
        <span>
          Página <strong className="font-medium text-gray-700">{page}</strong> de{' '}
          <strong className="font-medium text-gray-700">{safeTotalPages}</strong>
        </span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || disabled}
          className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg text-gray-600
                     hover:bg-gray-50 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= safeTotalPages || disabled}
          className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg text-gray-600
                     hover:bg-gray-50 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
