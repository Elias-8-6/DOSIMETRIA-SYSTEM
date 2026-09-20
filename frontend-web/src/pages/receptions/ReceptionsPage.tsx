import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Reception, PackagingCondition } from '../../api/receptions.api';
import { getReceptions } from '../../api/receptions.api';
import { useDebounce } from '../../hooks/useDebounce';
import { DataTable, TableStatusRow, TH_CLASS, TD_CLASS } from '../../components/ui/DataTable';
import { Pagination } from '../../components/ui/Pagination';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { PackagingConditionBadge } from '../../components/receptions/PackagingConditionBadge';
import { PACKAGING_CONDITION_LABELS } from '../../constants/receptions';
import { useAuth } from '../../hooks/useAuth';
import { formatDate } from '../../utils/date';

const PAGE_SIZE = 10;

export default function ReceptionsPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [receptions, setReceptions] = useState<Reception[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [packagingFilter, setPackagingFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const debouncedSearch = useDebounce(search, 300);

  const fetchReceptions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getReceptions({
        search: debouncedSearch || undefined,
        packaging_condition: (packagingFilter as PackagingCondition) || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setReceptions(data.items);
      setTotalPages(Math.ceil(data.total / PAGE_SIZE) || 1);
    } catch {
      setError('No se pudo cargar el listado de recepciones físicas');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, packagingFilter, page]);

  useEffect(() => {
    fetchReceptions();
  }, [fetchReceptions]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, packagingFilter]);

  return (
    <div className="p-6">
      <PageHeader
        title="Recepciones de Laboratorio"
        subtitle="Registro de ingreso físico y verificación de bultos dosimétricos (ISO 17025)"
        action={
          hasPermission('receptions', 'create') && (
            <Button onClick={() => navigate('/receptions/new')}>
              + Nueva Recepción
            </Button>
          )
        }
      />

      {/* Barra de Filtros */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Buscar por código de recepción, orden u observaciones..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-80
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        <select
          value={packagingFilter}
          onChange={(e) => setPackagingFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 bg-white"
        >
          <option value="">Todas las condiciones de empaque</option>
          <option value="integro">{PACKAGING_CONDITION_LABELS.integro}</option>
          <option value="danado_leve">{PACKAGING_CONDITION_LABELS.danado_leve}</option>
          <option value="danado_grave">{PACKAGING_CONDITION_LABELS.danado_grave}</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Tabla de Recepciones */}
      <DataTable>
        <thead>
          <tr>
            <th className={TH_CLASS}>Código Recepción</th>
            <th className={TH_CLASS}>Orden de Servicio</th>
            <th className={TH_CLASS}>Cliente</th>
            <th className={TH_CLASS}>Fecha de Ingreso</th>
            <th className={TH_CLASS}>Condición Empaque</th>
            <th className={TH_CLASS}>Dosímetros</th>
            <th className={TH_CLASS}>Receptor</th>
            <th className={TH_CLASS}>Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {loading ? (
            <TableStatusRow colSpan={8}>Cargando recepciones...</TableStatusRow>
          ) : receptions.length === 0 ? (
            <TableStatusRow colSpan={8}>
              No se encontraron recepciones con los filtros aplicados.
            </TableStatusRow>
          ) : (
            receptions.map((rec) => (
              <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                <td className={`${TD_CLASS} font-medium text-blue-600 cursor-pointer`}
                    onClick={() => navigate(`/receptions/${rec.id}`)}>
                  {rec.reception_code}
                </td>
                <td className={TD_CLASS}>
                  <span
                    className="hover:underline cursor-pointer font-medium text-gray-800"
                    onClick={() => navigate(`/service-orders/${rec.service_order_id}`)}
                  >
                    {rec.service_orders?.order_number ?? '—'}
                  </span>
                </td>
                <td className={TD_CLASS}>
                  {rec.service_orders?.clients?.name ?? '—'}
                </td>
                <td className={TD_CLASS}>
                  {formatDate(rec.received_at)}
                </td>
                <td className={TD_CLASS}>
                  <PackagingConditionBadge condition={rec.packaging_condition} />
                </td>
                <td className={TD_CLASS}>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {rec.items_count} dosímetro{rec.items_count !== 1 ? 's' : ''}
                  </span>
                </td>
                <td className={TD_CLASS}>
                  {rec.users?.full_name ?? '—'}
                </td>
                <td className={TD_CLASS}>
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`/receptions/${rec.id}`)}
                  >
                    Ver Detalle
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>

      {!loading && totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
