import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { createUser, updateUser } from '../../api/users.api';
import type { User, CreateUserPayload, UpdateUserPayload } from '../../api/users.api';

interface Props {
  user?: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * UserFormModal — crear y editar usuarios.
 * El rol es SIEMPRE obligatorio (crear y editar).
 * Incluye campos de perfil extendido (migraciones 012 y 013).
 */
export function UserFormModal({ user, onClose, onSuccess }: Props) {
  const isEditing = !!user;

  // Datos básicos
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [roleCode, setRoleCode] = useState(user?.roles?.[0]?.code ?? '');

  // Perfil profesional (migración 012)
  const [degreeTitle, setDegreeTitle] = useState(user?.degree_title ?? '');
  const [university, setUniversity] = useState(user?.university ?? '');
  const [location, setLocation] = useState(user?.location ?? '');

  // Datos personales (migración 013)
  const [documentNumber, setDocumentNumber] = useState(user?.document_number ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.date_of_birth ?? '');
  const [hireDate, setHireDate] = useState(user?.hire_date ?? '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setFullName(user?.full_name ?? '');
    setEmail(user?.email ?? '');
    setRoleCode(user?.roles?.[0]?.code ?? '');
    setDegreeTitle(user?.degree_title ?? '');
    setUniversity(user?.university ?? '');
    setLocation(user?.location ?? '');
    setDocumentNumber(user?.document_number ?? '');
    setPhone(user?.phone ?? '');
    setDateOfBirth(user?.date_of_birth ?? '');
    setHireDate(user?.hire_date ?? '');
    setPassword('');
    setError('');
  }, [user?.id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isEditing && user) {
        const payload: UpdateUserPayload = {};
        if (fullName !== user.full_name) payload.full_name = fullName;
        if (email !== user.email) payload.email = email;
        if (roleCode !== user.roles?.[0]?.code) payload.role_code = roleCode;
        if (degreeTitle !== (user.degree_title ?? '')) payload.degree_title = degreeTitle;
        if (university !== (user.university ?? '')) payload.university = university;
        if (location !== (user.location ?? '')) payload.location = location;
        if (documentNumber !== (user.document_number ?? ''))
          payload.document_number = documentNumber;
        if (phone !== (user.phone ?? '')) payload.phone = phone;
        if (dateOfBirth !== (user.date_of_birth ?? '')) payload.date_of_birth = dateOfBirth;
        if (hireDate !== (user.hire_date ?? '')) payload.hire_date = hireDate;

        await updateUser(user.id, payload);
      } else {
        const payload: CreateUserPayload = {
          full_name: fullName,
          email,
          password,
          role_code: roleCode,
          degree_title: degreeTitle || undefined,
          university: university || undefined,
          location: location || undefined,
          document_number: documentNumber || undefined,
          phone: phone || undefined,
          date_of_birth: dateOfBirth || undefined,
          hire_date: hireDate || undefined,
        };
        await createUser(payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      const apiError = err as { response?: { data?: { message?: string | string[] } } };
      const msg = apiError?.response?.data?.message ?? 'Error al guardar el usuario';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`;

  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
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

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
          {/* ── Sección: Datos básicos ────────────────────────────── */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Datos básicos
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nombre completo *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Juan Pérez"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="juan@laboratorio.com"
                  className={inputClass}
                />
              </div>

              {/* Password solo en creación */}
              {!isEditing && (
                <div>
                  <label className={labelClass}>Contraseña *</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Mínimo 8 caracteres"
                    className={inputClass}
                  />
                </div>
              )}

              {/* Rol — siempre requerido */}
              <div>
                <label className={labelClass}>Rol *</label>
                <select
                  value={roleCode}
                  onChange={(e) => setRoleCode(e.target.value)}
                  required
                  className={`${inputClass} bg-white cursor-pointer`}
                >
                  <option value="">Seleccionar rol</option>
                  <option value="admin_lab">Administrador del laboratorio</option>
                  <option value="tecnico_lab">Técnico de laboratorio</option>
                  <option value="coordinador_cliente">Coordinador de cliente</option>
                  <option value="auditor">Auditor ISO</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── Sección: Datos personales ─────────────────────────── */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Datos personales
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Cédula / DNI</label>
                <input
                  type="text"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="8-123-456"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Teléfono</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+507 6000-0000"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Fecha de nacimiento</label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Fecha de contratación</label>
                <input
                  type="date"
                  value={hireDate}
                  onChange={(e) => setHireDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* ── Sección: Perfil profesional ───────────────────────── */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Perfil profesional
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Título universitario</label>
                <input
                  type="text"
                  value={degreeTitle}
                  onChange={(e) => setDegreeTitle(e.target.value)}
                  placeholder="Lic. en Física"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Universidad</label>
                <input
                  type="text"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  placeholder="Universidad de Panamá"
                  className={inputClass}
                />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Ubicación</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ciudad de Panamá"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Acciones */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300
                         rounded-lg hover:border-gray-400 transition-colors cursor-pointer"
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
                ? isEditing
                  ? 'Guardando...'
                  : 'Creando...'
                : isEditing
                  ? 'Guardar cambios'
                  : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
