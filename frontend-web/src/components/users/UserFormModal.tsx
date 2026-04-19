import { useState, useEffect } from 'react';
import type { FormEvent} from "react";
import { createUser, updateUser } from '../../api/users.api';
import type { User, CreateUserPayload, UpdateUserPayload } from '../../api/users.api';

interface Props {
  user?: User | null;      // null = modo crear, User = modo editar
  onClose: () => void;
  onSuccess: () => void;   // solo notifica éxito — la lista se recarga en el padre
}

/**
 * UserFormModal — modal reutilizable para crear y editar usuarios.
 * Si recibe `user`, opera en modo edición (sin campo password).
 * Si no recibe `user`, opera en modo creación.
 */
export function UserFormModal({ user, onClose, onSuccess }: Props) {
  const isEditing = !!user;

  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [email,    setEmail]    = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [roleCode, setRoleCode] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  // Si el usuario cambia (abren editar otro usuario), sincronizar los campos
  useEffect(() => {
    setFullName(user?.full_name ?? '');
    setEmail(user?.email ?? '');
    setPassword('');
    setError('');
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isEditing && user) {
        // Modo edición — solo envía campos que cambiaron
        const payload: UpdateUserPayload = {};
        if (fullName !== user.full_name) payload.full_name = fullName;
        if (email    !== user.email)     payload.email     = email;
        await updateUser(user.id, payload);
      } else {
        // Modo creación — todos los campos requeridos
        const payload: CreateUserPayload = {
          full_name: fullName,
          email,
          password,
          role_code: roleCode || undefined,
        };
        await createUser(payload);
      }

      onSuccess(); // Notifica al padre para recargar la lista
      onClose();
    } catch (err) {
      const apiError = err as { response?: { data?: { message?: string | string[] } } };
      const msg = apiError?.response?.data?.message ?? 'Error al guardar el usuario';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    // Overlay oscuro — click fuera cierra el modal
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      {/* Contenedor — stopPropagation evita que el click dentro cierre el modal */}
      <div
        className="bg-white rounded-xl shadow-lg w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            {isEditing ? 'Editar usuario' : 'Nuevo usuario'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre completo
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Juan Pérez"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="juan@laboratorio.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Password solo en creación */}
          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Mínimo 8 caracteres"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Rol solo en creación */}
          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rol <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <select
                value={roleCode}
                onChange={(e) => setRoleCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
              >
                <option value="">Sin rol</option>
                <option value="admin_lab">Administrador</option>
                <option value="tecnico_lab">Técnico</option>
                <option value="supervisor">Supervisor</option>
                <option value="recepcionista">Recepcionista</option>
              </select>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Acciones */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900
                         border border-gray-300 rounded-lg hover:border-gray-400
                         transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600
                         hover:bg-blue-700 disabled:bg-blue-400 rounded-lg
                         transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {loading
                ? (isEditing ? 'Guardando...' : 'Creando...')
                : (isEditing ? 'Guardar cambios' : 'Crear usuario')}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
