import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsers } from '../../api/users.api';
import type { User } from '../../api/users.api';
import { useAuth } from '../../hooks/useAuth';
import { UserFormModal } from '../../components/users/UserFormModal';

/**
 * UsersPage — listado de usuarios con búsqueda y filtros.
 */
export function UsersPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [users,       setUsers]       = useState<User[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [search,      setSearch]      = useState('');
  const [status,      setStatus]      = useState('');
  const [showModal,   setShowModal]   = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // fetchUsers extraído como función del componente para poder llamarla
  // tanto desde el useEffect como desde handleSuccess
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getUsers({
        search: search || undefined,
        status: status || undefined,
      });
      setUsers(data);
    } catch {
      setError('No se pudo cargar el listado de usuarios');
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  // Debounce — espera 400ms después de que el usuario deja de escribir
  useEffect(() => {
    const timeout = setTimeout(fetchUsers, 400);
    return () => clearTimeout(timeout);
  }, [fetchUsers]);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setShowModal(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  // Al guardar exitosamente, recarga la lista completa desde el backend.
  // Esto garantiza que los datos (incluyendo roles[]) estén siempre frescos.
  const handleSuccess = useCallback(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Gestión de usuarios del sistema
          </p>
        </div>
        {hasPermission('users', 'create') && (
          <button
            onClick={handleOpenCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm
                       font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            Nuevo usuario
          </button>
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
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

        {loading && (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">
            Cargando usuarios...
          </div>
        )}

        {error && (
          <div className="px-6 py-4 text-red-600 text-sm">{error}</div>
        )}

        {!loading && !error && users.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">
            No se encontraron usuarios
          </div>
        )}

        {!loading && !error && users.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 font-medium text-gray-600">Nombre</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Rol</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Estado</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {user.full_name}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{user.email}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {user.roles[0]?.name ?? '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.status === 'active'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {user.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
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
                        Ver detalle
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal — se monta solo cuando showModal es true */}
      {showModal && (
        <UserFormModal
          user={editingUser}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
