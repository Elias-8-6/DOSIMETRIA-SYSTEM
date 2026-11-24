import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getHolders,
  type HolderDosimeter,
} from '../../api/dosimeters.api';
import { CreateHolderModal } from '../../components/dosimeters/CreateHolderModal';
import { EditHolderModal } from '../../components/dosimeters/EditHolderModal';
import { HolderDetailModal } from '../../components/dosimeters/HolderDetailModal';

export default function HoldersPage() {
  const navigate = useNavigate();

  const [holders, setHolders] = useState<HolderDosimeter[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Filtros
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedHolderForDetail, setSelectedHolderForDetail] = useState<HolderDosimeter | null>(null);
  const [selectedHolderForEdit, setSelectedHolderForEdit] = useState<HolderDosimeter | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadHolders = useCallback(async (customSearch?: string) => {
    try {
      setLoading(true);
      setError(null);
      const querySearch = customSearch !== undefined ? customSearch : searchInput;
      const res = await getHolders({
        page,
        limit,
        search: querySearch.trim() || undefined,
        status: statusFilter || undefined,
        current_condition: conditionFilter || undefined,
      });
      setHolders(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      setError(apiErr?.response?.data?.message || 'Error al cargar portadosímetros.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchInput, statusFilter, conditionFilter]);

  useEffect(() => {
    loadHolders();
  }, [loadHolders]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadHolders(searchInput);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setStatusFilter('');
    setConditionFilter('');
    setPage(1);
    loadHolders('');
  };

  // KPIs
  const totalHolders = total;
  const availableHolders = holders.filter((h) => h.status === 'disponible').length;
  const assembledHolders = holders.filter((h) => h.status === 'ensamblado' || h.active_assembly).length;
  const damagedHolders = holders.filter(
    (h) => h.status === 'danado' || h.current_condition.startsWith('danado') || h.status === 'en_triaje',
  ).length;

  const statusColors: Record<string, string> = {
    disponible: 'bg-green-100 text-green-800 border-green-200',
    ensamblado: 'bg-blue-100 text-blue-800 border-blue-200',
    en_campo: 'bg-purple-100 text-purple-800 border-purple-200',
    en_triaje: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    danado: 'bg-red-100 text-red-800 border-red-200',
    baja: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const conditionBadges: Record<string, string> = {
    integro: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    danado_leve: 'bg-amber-50 text-amber-700 border-amber-200',
    danado_grave: 'bg-rose-50 text-rose-700 border-rose-200',
    sello_roto: 'bg-orange-50 text-orange-700 border-orange-200',
    contaminado: 'bg-purple-50 text-purple-700 border-purple-200',
    perdido: 'bg-gray-50 text-gray-700 border-gray-200',
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Encabezado y acciones principales */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Portadosímetros</h1>
          <p className="text-xs text-gray-500 mt-1">
            Gestión y trazabilidad de chasis exteriores con código de barras y compatibilidad con lector USB.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/dosimeters/assembly')}
            className="px-3.5 py-2 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg shadow-2xs cursor-pointer flex items-center gap-1.5"
          >
            <span>↳ Ir a Ensamblaje</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer flex items-center gap-2"
          >
            <span>+ Registrar con Lector USB</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas (KPIs) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-xs text-gray-500 font-medium block">Total Registrados</span>
          <span className="text-2xl font-bold text-gray-900 mt-1 block">{totalHolders}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-xs text-green-600 font-medium block">Disponibles (Libres)</span>
          <span className="text-2xl font-bold text-green-700 mt-1 block">{availableHolders}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-xs text-blue-600 font-medium block">Ensamblados (Con TLD)</span>
          <span className="text-2xl font-bold text-blue-700 mt-1 block">{assembledHolders}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-xs text-amber-600 font-medium block">Triaje / Dañados</span>
          <span className="text-2xl font-bold text-amber-700 mt-1 block">{damagedHolders}</span>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          {/* Input de lector / búsqueda */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              🔍
            </span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Escanear código de barras con lector USB o buscar por serie/modelo..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Filtro por estado */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white text-gray-700"
          >
            <option value="">Todos los Estados</option>
            <option value="disponible">Disponibles</option>
            <option value="ensamblado">Ensamblados</option>
            <option value="en_campo">En Campo</option>
            <option value="en_triaje">En Triaje</option>
            <option value="danado">Dañados</option>
            <option value="baja">Dados de Baja</option>
          </select>

          {/* Filtro por condición */}
          <select
            value={conditionFilter}
            onChange={(e) => {
              setConditionFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white text-gray-700"
          >
            <option value="">Todas las Condiciones</option>
            <option value="integro">Íntegro</option>
            <option value="danado_leve">Dañado Leve</option>
            <option value="danado_grave">Dañado Grave</option>
            <option value="sello_roto">Sello Roto</option>
            <option value="contaminado">Contaminado</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-medium cursor-pointer"
          >
            Buscar
          </button>

          {(searchInput || statusFilter || conditionFilter) && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-3 py-2 text-xs text-gray-500 hover:text-gray-800 cursor-pointer"
            >
              Limpiar
            </button>
          )}
        </form>
      </div>

      {/* Alerta de Error */}
      {error && (
        <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs rounded">
          {error}
        </div>
      )}

      {/* Tabla de Portadosímetros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Código / Serie</th>
                <th className="py-3 px-4">Color / Clip</th>
                <th className="py-3 px-4">Modelo / Ubicación</th>
                <th className="py-3 px-4">Condición</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Ensamble Activo (TLD)</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    Cargando portadosímetros...
                  </td>
                </tr>
              )}

              {!loading && holders.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    No se encontraron portadosímetros con los filtros aplicados.
                  </td>
                </tr>
              )}

              {!loading &&
                holders.map((holder) => (
                  <tr key={holder.id} className="hover:bg-gray-50/60 transition-colors">
                    {/* Código y Serie */}
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-gray-900 block">
                        {holder.barcode}
                      </span>
                      {holder.serial_number !== holder.barcode && (
                        <span className="text-[11px] font-mono text-gray-400">
                          S/N: {holder.serial_number}
                        </span>
                      )}
                    </td>

                    {/* Color y Clip */}
                    <td className="py-3 px-4">
                      <span className="capitalize text-gray-800 font-medium block">
                        {holder.holder_color || 'Azul'}
                      </span>
                      <span className="text-[11px] text-gray-400 capitalize">
                        {(holder.clip_type || 'pinza').replace('_', ' ')}
                      </span>
                    </td>

                    {/* Modelo y Ubicación */}
                    <td className="py-3 px-4">
                      <span className="text-gray-800 block">
                        {holder.model || 'Genérico'}
                      </span>
                      <span className="text-[11px] text-gray-400 block truncate max-w-[140px]">
                        {holder.storage_location || '—'}
                      </span>
                    </td>

                    {/* Condición */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${
                          conditionBadges[holder.current_condition] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {holder.current_condition.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Estado */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          statusColors[holder.status] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {holder.status.toUpperCase()}
                      </span>
                    </td>

                    {/* Ensamble TLD / Dosímetro */}
                    <td className="py-3 px-4">
                      {holder.active_assembly?.dosimeter ? (
                        <div className="flex items-center gap-1.5 text-blue-700 font-medium">
                          <span>🛡️</span>
                          <span className="font-mono text-xs">
                            DOS-{holder.active_assembly.dosimeter.serial_number}
                          </span>
                        </div>
                      ) : holder.active_assembly?.tld_card ? (
                        <div className="flex items-center gap-1.5 text-indigo-700 font-medium">
                          <span>🔗</span>
                          <span className="font-mono text-xs">
                            TLD-{holder.active_assembly.tld_card.serial_number}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">⚪ Libre</span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedHolderForDetail(holder)}
                          className="px-2.5 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded border border-blue-200 cursor-pointer"
                        >
                          Ficha
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedHolderForEdit(holder)}
                          className="px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded border border-gray-200 cursor-pointer"
                        >
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="p-3 border-t border-gray-200 bg-gray-50/50 flex items-center justify-between text-xs text-gray-500">
          <span>
            Mostrando {holders.length} de {total} portadosímetros (Página {page} de {totalPages})
          </span>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
            >
              ← Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
            >
              Siguiente →
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Registro con Lector */}
      {showCreateModal && (
        <CreateHolderModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            loadHolders();
          }}
          onViewDetails={(holder) => {
            setSelectedHolderForDetail(holder);
          }}
        />
      )}

      {/* Modal de Detalle / Ficha */}
      {selectedHolderForDetail && (
        <HolderDetailModal
          holderId={selectedHolderForDetail.id}
          onClose={() => setSelectedHolderForDetail(null)}
          onEdit={(h) => setSelectedHolderForEdit(h)}
        />
      )}

      {/* Modal de Edición */}
      {selectedHolderForEdit && (
        <EditHolderModal
          holder={selectedHolderForEdit}
          onClose={() => setSelectedHolderForEdit(null)}
          onSuccess={() => loadHolders()}
        />
      )}
    </div>
  );
}
