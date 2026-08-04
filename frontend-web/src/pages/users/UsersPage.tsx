import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsers } from '../../api/users.api';
import type { User } from '../../api/users.api';
import { useAuth } from '../../hooks/useAuth';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../hooks/useToast';
import { UserFormModal } from '../../components/users/UserFormModal';
import { DataTable, TableStatusRow, TH_CLASS, TD_CLASS } from '../../components/ui/DataTable';
import { Pagination } from '../../components/ui/Pagination';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';

/**
 * UsersPage — listado de usuarios con búsqueda y filtros.
 */
export function UsersPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [modalKey, setModalKey] = useState(0);
  const limit = 10;

  const debouncedSearch = useDebounce(search, 400);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getUsers({
        search: debouncedSearch || undefined,
        status: status || undefined,
        page,
        limit,
      });
      setUsers(data.items);
      setTotal(data.total);
    } catch {
      setError('No se pudo cargar el listado de usuarios');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleOpenCreate = () => {
    setEditingUser(null);
    setModalKey((k) => k + 1);
    setShowModal(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setModalKey((k) => k + 1);
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingUser(null);
    setModalKey((k) => k + 1);
  };

  // Al guardar exitosamente, recarga la lista completa desde el backend.
  // Esto garantiza que los datos (incluyendo roles[]) estén siempre frescos.
  const handleSuccess = useCallback(() => {
    showToast(editingUser ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente');
    fetchUsers();
  }, [fetchUsers, showToast, editingUser]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-500 mt-1 text-sm">Gestión de usuarios del sistema</p>
        </div>
        {hasPermission('users', 'create') && (
          <Button onClick={handleOpenCreate}>Nuevo usuario</Button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
        >
          <option value="">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      {/* Tabla */}
      <DataTable>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className={TH_CLASS}>Nombre</th>
              <th className={TH_CLASS}>Email</th>
              <th className={TH_CLASS}>Rol</th>
              <th className={TH_CLASS}>Estado</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <TableStatusRow colSpan={5}>Cargando usuarios...</TableStatusRow>
            ) : error ? (
              <TableStatusRow colSpan={5}>
                <span className="text-red-600">{error}</span>
              </TableStatusRow>
            ) : users.length === 0 ? (
              <TableStatusRow colSpan={5}>No se encontraron usuarios</TableStatusRow>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className={`${TD_CLASS} font-medium text-gray-900`}>{user.full_name}</td>
                  <td className={`${TD_CLASS} text-gray-600`}>{user.email}</td>
                  <td className={`${TD_CLASS} text-gray-600`}>{user.roles[0]?.name ?? '—'}</td>
                  <td className={TD_CLASS}>
                    <StatusBadge active={user.status === 'active'} />
                  </td>
                  <td className={`${TD_CLASS} text-right`}>
                    <div className="flex items-center justify-end gap-3">
                      {hasPermission('users', 'update') && (
                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="text-gray-500 hover:text-gray-800 text-sm cursor-pointer"
                        >
                          Editar
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/users/${user.id}`)}
                        className="text-blue-600 hover:text-blue-800 text-sm cursor-pointer"
                      >
                        Permisos
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!loading && !error && total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm text-gray-600">
            <span>
              {total} usuario{total === 1 ? '' : 's'}
            </span>
          </div>
        )}
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </DataTable>

      {showModal && (
        <UserFormModal
          key={modalKey}
          user={editingUser}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
