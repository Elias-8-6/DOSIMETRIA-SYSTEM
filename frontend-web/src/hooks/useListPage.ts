import { useState, useEffect, useCallback, useMemo } from 'react';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

interface UseListPageOptions<T, P> {
  fetcher: (params: P) => Promise<PaginatedResult<T>>;
  params: Omit<P, 'page' | 'limit'>;
  pageSize?: number;
  errorMessage?: string;
}

export function useListPage<T, P extends { page?: number; limit?: number }>({
  fetcher,
  params,
  pageSize = 10,
  errorMessage = 'No se pudieron cargar los datos',
}: UseListPageOptions<T, P>) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Serializar parámetros para comparación estable
  const paramsKey = JSON.stringify(params);

  // Reset de página cuando cambian los filtros/búsqueda
  useEffect(() => {
    setPage(1);
  }, [paramsKey]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const parsedParams = JSON.parse(paramsKey);
      const data = await fetcher({
        ...parsedParams,
        page,
        limit: pageSize,
      } as P);
      setItems(data.items);
      setTotal(data.total);
    } catch {
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fetcher, paramsKey, page, pageSize, errorMessage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = useMemo(() => {
    return Math.ceil(total / pageSize) || 1;
  }, [total, pageSize]);

  return {
    items,
    setItems,
    total,
    page,
    setPage,
    totalPages,
    loading,
    error,
    refetch: fetchData,
  };
}
