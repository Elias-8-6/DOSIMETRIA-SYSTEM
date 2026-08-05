import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Dosimeter, DosimeterCondition } from '../../api/dosimeters.api';
import { getDosimeters } from '../../api/dosimeters.api';
import type { DosimeterType, DosimeterStatus } from '../../api/catalogs.api';
import { getDosimeterTypes, getDosimeterStatuses } from '../../api/catalogs.api';
import { DosimeterFormModal } from '../../components/dosimeters/DosimeterFormModal';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../hooks/useToast';
import { DataTable, TableStatusRow, TH_CLASS, TD_CLASS } from '../../components/ui/DataTable';
import { Pagination } from '../../components/ui/Pagination';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';

const CONDITION_LABELS: Record<DosimeterCondition, string> = {
  normal: 'Normal',
  danado: 'Dañado',
  contaminado: 'Contaminado',
  perdido: 'Perdido',
};

const PAGE_SIZE = 10;

export default function DosimetersPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { hasPermission } = useAuth();

  const [dosimeters, setDosimeters] = useState<Dosimeter[]>([]);
  const [types, setTypes] = useState<DosimeterType[]>([]);
  const [statuses, setStatuses] = useState<DosimeterStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    getDosimeterTypes()
      .then(setTypes)
      .catch(() => {});
    getDosimeterStatuses()
      .then(setStatuses)
      .catch(() => {});
  }, []);

  const fetchDosimeters = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getDosimeters({
        search: debouncedSearch || undefined,
        dosimeter_type_id: typeFilter || undefined,
        status_code: statusFilter || undefined,
        current_condition: conditionFilter || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setDosimeters(data.items);
      setTotalPages(Math.ceil(data.total / PAGE_SIZE));
    } catch {
      setError('No se pudo cargar el listado de dosímetros');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, typeFilter, statusFilter, conditionFilter, page]);

  useEffect(() => {
    fetchDosimeters();
  }, [fetchDosimeters]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, typeFilter, statusFilter, conditionFilter]);

  const handleFormSuccess = useCallback(() => {
    showToast('Dosímetro creado correctamente');
    fetchDosimeters();
  }, [fetchDosimeters, showToast]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dosímetros</h1>
          <p className="text-sm text-gray-500 mt-0.5">Inventario y asignación de dosímetros</p>
        </div>
        {hasPermission('dosimeters', 'create') && (
          <Button
            onClick={() => {
              setModalKey((k) => k + 1);
              setFormModalOpen(true);
            }}
          >
            Nuevo dosímetro
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Buscar por serie, código o lote..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[220px] px-3 py-2 border border-gray-300 rounded-lg text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los tipos</option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los estados</option>
          {statuses.map((s) => (
            <option key={s.id} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={conditionFilter}
          onChange={(e) => setConditionFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas las condiciones</option>
          {Object.entries(CONDITION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <DataTable>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className={TH_CLASS}>Serie</th>
              <th className={TH_CLASS}>Código interno</th>
              <th className={TH_CLASS}>Tipo</th>
              <th className={TH_CLASS}>Estado</th>
              <th className={TH_CLASS}>Condición</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableStatusRow colSpan={6}>Cargando...</TableStatusRow>
            ) : error ? (
              <TableStatusRow colSpan={6}>
                <span className="text-red-600">{error}</span>
              </TableStatusRow>
            ) : dosimeters.length === 0 ? (
              <TableStatusRow colSpan={6}>No se encontraron dosímetros</TableStatusRow>
            ) : (
              dosimeters.map((dosimeter) => (
                <tr
                  key={dosimeter.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className={`${TD_CLASS} font-medium text-gray-900`}>
                    {dosimeter.serial_number}
                  </td>
                  <td className={`${TD_CLASS} text-gray-500`}>{dosimeter.internal_code ?? '—'}</td>
                  <td className={`${TD_CLASS} text-gray-600`}>{dosimeter.dosimeter_types.name}</td>
                  <td className={TD_CLASS}>
                    <StatusBadge
                      active={dosimeter.dosimeter_statuses.code === 'DISPONIBLE'}
                      activeLabel={dosimeter.dosimeter_statuses.name}
                      inactiveLabel={dosimeter.dosimeter_statuses.name}
                    />
                  </td>
                  <td className={`${TD_CLASS} text-gray-600`}>
                    {CONDITION_LABELS[dosimeter.current_condition]}
                  </td>
                  <td className={TD_CLASS}>
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => navigate(`/dosimeters/${dosimeter.id}`)}
                        className="text-blue-600 hover:text-blue-700 cursor-pointer"
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

      {/* Modal crear dosímetro */}
      {formModalOpen && (
        <DosimeterFormModal
          key={modalKey}
          types={types}
          onClose={() => setFormModalOpen(false)}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
