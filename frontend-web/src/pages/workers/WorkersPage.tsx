import { useState, useEffect, useCallback } from 'react';
import type { Worker } from '../../api/workers.api';
import { getWorkers, getWorker } from '../../api/workers.api';
import type { WorkerDetail } from '../../api/workers.api';
import { WorkerFormModal } from '../../components/workers/ WorkerFormModal.tsx';
import { WorkerDetailModal } from '../../components/workers/WorkerDetailModal';

interface Props {
  clientId?: string; // si viene, filtra por cliente y oculta ese filtro
}

const PAGE_SIZE = 10;

export default function WorkersPage({ clientId }: Props) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
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

  const fetchWorkers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getWorkers({
        search: search || undefined,
        status: statusFilter || undefined,
        client_id: clientId || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setWorkers(data.items);
      setTotalPages(Math.ceil(data.total / PAGE_SIZE));
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, clientId, page]);

  useEffect(() => {
    const timer = setTimeout(fetchWorkers, 300);
    return () => clearTimeout(timer);
  }, [fetchWorkers]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, clientId, setPage]);

  const handleFormSuccess = useCallback(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  const handleOpenDetail = async (worker: Worker) => {
    try {
      const detail = await getWorker(worker.id);
      setDetailModal({ open: true, worker: detail });
    } catch {
      // silencioso
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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trabajadores</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de trabajadores dosimetrados</p>
        </div>
        <button
          onClick={() => {
            setModalKey((k) => k + 1);
            setFormModal({ open: true, worker: null });
          }}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
        >
          Nuevo trabajador
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Buscar por nombre, documento o código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[220px] px-3 py-2 border border-gray-300 rounded-lg text-sm
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

      {/* Tabla */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Documento</th>
              {!clientId && (
                <th className="text-left px-4 py-3 font-medium text-gray-600">Institución</th>
              )}
              <th className="text-left px-4 py-3 font-medium text-gray-600">Sede</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Ocupación</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={clientId ? 6 : 7} className="text-center py-12 text-gray-400">
                  Cargando...
                </td>
              </tr>
            ) : workers.length === 0 ? (
              <tr>
                <td colSpan={clientId ? 6 : 7} className="text-center py-12 text-gray-400">
                  No se encontraron trabajadores
                </td>
              </tr>
            ) : (
              workers.map((worker) => (
                <tr
                  key={worker.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{worker.full_name}</td>
                  <td className="px-4 py-3 text-gray-500">{worker.document_number ?? '—'}</td>
                  {!clientId && (
                    <td className="px-4 py-3 text-gray-600">{worker.clients?.name ?? '—'}</td>
                  )}
                  <td className="px-4 py-3 text-gray-600">
                    {worker.client_locations?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{worker.occupation ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        worker.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {worker.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
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

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600
                           hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600
                           hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

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
