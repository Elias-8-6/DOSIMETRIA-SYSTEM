import { useState, useEffect, useCallback } from 'react';
import type { Worker } from '../../api/workers.api';
import { getWorkers, getWorker } from '../../api/workers.api';
import type { WorkerDetail } from '../../api/workers.api';
import { WorkerFormModal } from '../../components/workers/WorkerFormModal';
import { WorkerDetailModal } from '../../components/workers/WorkerDetailModal';
import { useDebounce } from '../../hooks/useDebounce';
import { DataTable, TableStatusRow, TH_CLASS, TD_CLASS } from '../../components/ui/DataTable';
import { Pagination } from '../../components/ui/Pagination';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';

interface Props {
  clientId?: string;
  clientLocationId?: string; // filtro por departamento cuando viene embebido
  embedded?: boolean; // true = sin header ni padding exterior
}

const PAGE_SIZE = 10;

export default function WorkersPage({ clientId, clientLocationId, embedded }: Props) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modalKey, setModalKey] = useState(0);

  const [formModal, setFormModal] = useState<{ open: boolean; worker: Worker | null }>({
    open: false,
    worker: null,
  });
  const [detailModal, setDetailModal] = useState<{ open: boolean; worker: WorkerDetail | null }>({
    open: false,
    worker: null,
  });
  const [detailError, setDetailError] = useState('');

  const debouncedSearch = useDebounce(search, 300);

  const fetchWorkers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getWorkers({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        client_id: clientId || undefined,
        client_location_id: clientLocationId || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setWorkers(data.items);
      setTotalPages(Math.ceil(data.total / PAGE_SIZE));
    } catch {
      setError('No se pudo cargar el listado de trabajadores');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, clientId, clientLocationId, page]);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, clientId, clientLocationId]);

  const handleFormSuccess = useCallback(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  const handleOpenDetail = async (worker: Worker) => {
    setDetailError('');
    try {
      const detail = await getWorker(worker.id);
      setDetailModal({ open: true, worker: detail });
    } catch {
      setDetailError('No se pudo cargar el detalle del trabajador');
    }
  };

  const handleDetailUpdate = (updated: WorkerDetail) => {
    setWorkers((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
    setDetailModal((prev) => ({ ...prev, worker: updated }));
  };

  const handleEditFromDetail = (worker: WorkerDetail) => {
    setDetailModal({ open: false, worker: null });
    setModalKey((k) => k + 1);
    setFormModal({ open: true, worker });
  };

  // Cuando es embebido (dentro de ClientDetailPage) el layout es compacto
  const colSpan = clientId ? 6 : 7;

  return (
    <div className={embedded ? '' : 'p-6'}>
      {/* Header — se oculta cuando es embebido */}
      {!embedded && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Trabajadores</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gestión de trabajadores dosimetrados</p>
          </div>
          <Button
            accent="emerald"
            onClick={() => {
              setModalKey((k) => k + 1);
              setFormModal({ open: true, worker: null });
            }}
          >
            Nuevo trabajador
          </Button>
        </div>
      )}

      {/* Filtros — más compactos cuando es embebido */}
      <div className={`flex gap-3 flex-wrap ${embedded ? 'mb-3' : 'mb-4'}`}>
        <input
          type="text"
          placeholder="Buscar por nombre, documento o código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[180px] px-3 py-2 border border-gray-300 rounded-lg text-sm
            focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>
      </div>

      {detailError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          <p className="text-red-600 text-sm">{detailError}</p>
        </div>
      )}

      {/* Tabla */}
      <DataTable>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className={TH_CLASS}>Nombre</th>
              <th className={TH_CLASS}>Documento</th>
              {!clientId && <th className={TH_CLASS}>Institución</th>}
              {!clientLocationId && <th className={TH_CLASS}>Sede</th>}
              <th className={TH_CLASS}>Ocupación</th>
              <th className={TH_CLASS}>Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableStatusRow colSpan={colSpan}>Cargando...</TableStatusRow>
            ) : error ? (
              <TableStatusRow colSpan={colSpan}>
                <span className="text-red-600">{error}</span>
              </TableStatusRow>
            ) : workers.length === 0 ? (
              <TableStatusRow colSpan={colSpan}>No se encontraron trabajadores</TableStatusRow>
            ) : (
              workers.map((worker) => (
                <tr
                  key={worker.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className={`${TD_CLASS} font-medium text-gray-900`}>{worker.full_name}</td>
                  <td className={`${TD_CLASS} text-gray-500`}>{worker.document_number ?? '—'}</td>
                  {!clientId && (
                    <td className={`${TD_CLASS} text-gray-600`}>{worker.clients?.name ?? '—'}</td>
                  )}
                  {!clientLocationId && (
                    <td className={`${TD_CLASS} text-gray-600`}>
                      {worker.client_locations?.name ?? '—'}
                    </td>
                  )}
                  <td className={`${TD_CLASS} text-gray-600`}>{worker.occupation ?? '—'}</td>
                  <td className={TD_CLASS}>
                    <StatusBadge active={worker.status === 'active'} />
                  </td>
                  <td className={TD_CLASS}>
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => handleOpenDetail(worker)}
                        className="text-emerald-600 hover:text-emerald-700 cursor-pointer"
                      >
                        Ver detalle
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </DataTable>

      {/* Modales */}
      {formModal.open && (
        <WorkerFormModal
          key={modalKey}
          worker={formModal.worker}
          clientId={clientId}
          onClose={() => setFormModal({ open: false, worker: null })}
          onSuccess={handleFormSuccess}
        />
      )}

      {detailModal.open && detailModal.worker && (
        <WorkerDetailModal
          worker={detailModal.worker}
          onClose={() => setDetailModal({ open: false, worker: null })}
          onUpdate={handleDetailUpdate}
          onEdit={handleEditFromDetail}
        />
      )}
    </div>
  );
}
