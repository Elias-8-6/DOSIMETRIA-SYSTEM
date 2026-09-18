import { useState, useEffect, useCallback } from 'react';

export function useDetailPage<T>(
  id: string | undefined,
  fetcher: (id: string) => Promise<T>,
  defaultErrorMessage = 'No se pudo cargar la información'
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const result = await fetcher(id);
      setData(result);
    } catch {
      setError(defaultErrorMessage);
    } finally {
      setLoading(false);
    }
  }, [id, fetcher, defaultErrorMessage]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    data,
    setData,
    loading,
    error,
    refetch,
  };
}
