import { useMemo } from 'react';

export interface BaseAssignment {
  status?: string;
  assigned_at: string;
  returned_at?: string | null;
}

/**
 * Ordena las asignaciones de dosímetros:
 * 1. Asignaciones activas primero (status === 'activo' o sin returned_at).
 * 2. Por fecha de asignación descendente (assigned_at DESC).
 * 3. En caso de empate en assigned_at, por fecha de devolución descendente (abiertas primero).
 */
export function useSortedAssignments<T extends BaseAssignment>(assignments?: T[] | null): T[] {
  return useMemo(() => {
    return [...(assignments ?? [])].sort((a, b) => {
      const aIsActive = a.status === 'activo' || !a.returned_at;
      const bIsActive = b.status === 'activo' || !b.returned_at;
      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;

      const dateA = new Date(a.assigned_at).getTime();
      const dateB = new Date(b.assigned_at).getTime();
      if (dateB !== dateA) return dateB - dateA;

      if (!a.returned_at && b.returned_at) return -1;
      if (a.returned_at && !b.returned_at) return 1;
      if (a.returned_at && b.returned_at) {
        return new Date(b.returned_at).getTime() - new Date(a.returned_at).getTime();
      }

      return 0;
    });
  }, [assignments]);
}
