import { useState } from 'react';
import { createUser, type CreateUserPayload } from '../../api/users.api';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ROLES = [
  { value: 'admin_lab', label: 'Administrador de Laboratorio' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'dosimetrista', label: 'Dosimetrista' },
  { value: 'coordinador', label: 'Coordinador' },
  { value: 'auditor', label: 'Auditor' },
];

export default function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const [form, setForm] = useState<CreateUserPayload>({
    full_name: '',
    email: '',
    password: '',
    role_code: '',
  });
  const [errors, setErrors] = useState<Partial<CreateUserPayload>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: Partial<CreateUserPayload> = {};
    if (!form.full_name.trim()) newErrors.full_name = 'El nombre es requerido';
    if (!form.email.trim()) {
      newErrors.email = 'El correo es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Correo inválido';
    }
    if (!form.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (form.password.length < 8) {
      newErrors.password = 'Mínimo 8 caracteres';
    }
    if (!form.role_code) {
      newErrors.role_code = 'El rol es requerido';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsLoading(true);
    setServerError('');
    try {
      const dto: CreateUserPayload = {
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role_code: form.role_code,
      };
      await createUser(dto);
      setForm({ full_name: '', email: '', password: '', role_code: '' });
      onSuccess();
      onClose();
    } catch (err: any) {
      setServerError(err?.response?.data?.message || 'Error al crear usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setForm({ full_name: '', email: '', password: '', role_code: '' });
    setErrors({});
    setServerError('');
    onClose();
  };

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      {/* Modal */}
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: 'var(--color-accent-muted)' }}
            >
              <svg className="h-5 w-5" style={{ color: 'var(--color-accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Nuevo usuario
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Complete los datos del nuevo operador
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-gray-100"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {serverError && (
            <div
              className="rounded-lg px-4 py-3 text-sm"
              style={{ backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}
            >
              {serverError}
            </div>
          )}

          {/* Nombre completo */}
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Nombre completo <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="Ej. María López"
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
              style={{
                backgroundColor: 'var(--color-input-bg)',
                border: errors.full_name ? '1.5px solid #ef4444' : '1.5px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
            {errors.full_name && (
              <p className="mt-1 text-xs" style={{ color: '#ef4444' }}>{errors.full_name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Correo electrónico <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="usuario@laboratorio.com"
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
              style={{
                backgroundColor: 'var(--color-input-bg)',
                border: errors.email ? '1.5px solid #ef4444' : '1.5px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
            {errors.email && (
              <p className="mt-1 text-xs" style={{ color: '#ef4444' }}>{errors.email}</p>
            )}
          </div>

          {/* Contraseña */}
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Contraseña inicial <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Mínimo 8 caracteres"
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
              style={{
                backgroundColor: 'var(--color-input-bg)',
                border: errors.password ? '1.5px solid #ef4444' : '1.5px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
            {errors.password && (
              <p className="mt-1 text-xs" style={{ color: '#ef4444' }}>{errors.password}</p>
            )}
          </div>

          {/* Rol */}
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Rol inicial <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={form.role_code}
              onChange={(e) => setForm({ ...form, role_code: e.target.value })}
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
              style={{
                backgroundColor: 'var(--color-input-bg)',
                border: errors.role_code ? '1.5px solid #ef4444' : '1.5px solid var(--color-border)',
                color: form.role_code ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              }}
            >
              <option value="">Seleccionar rol</option>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            {errors.role_code ? (
              <p className="mt-1 text-xs" style={{ color: '#ef4444' }}>{errors.role_code}</p>
            ) : (
              <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Los permisos se asignan individualmente desde el detalle del usuario.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="rounded-xl px-4 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white transition-opacity"
            style={{
              backgroundColor: 'var(--color-accent)',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creando…
              </>
            ) : (
              'Crear usuario'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
