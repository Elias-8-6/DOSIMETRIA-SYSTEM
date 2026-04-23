import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { updateProfile, changePassword } from '../../api/profile.api';
import type { UpdateProfilePayload, ChangePasswordPayload } from '../../api/profile.api';
import { useAuth } from '../../hooks/useAuth';

interface Props {
  onClose: () => void;
}

type Tab = 'profile' | 'password';

export function ProfileModal({ onClose }: Props) {
  const { user, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // Datos básicos
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');

  // Perfil profesional (migración 012)
  const [degreeTitle, setDegreeTitle] = useState(user?.degree_title ?? '');
  const [university, setUniversity] = useState(user?.university ?? '');
  const [location, setLocation] = useState(user?.location ?? '');

  // Datos personales (migración 013)
  const [documentNumber, setDocumentNumber] = useState(user?.document_number ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.date_of_birth ?? '');

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Contraseña
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    setFullName(user?.full_name ?? '');
    setEmail(user?.email ?? '');
    setDegreeTitle(user?.degree_title ?? '');
    setUniversity(user?.university ?? '');
    setLocation(user?.location ?? '');
    setDocumentNumber(user?.document_number ?? '');
    setPhone(user?.phone ?? '');
    setDateOfBirth(user?.date_of_birth ?? '');
  }, [user]);

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setProfileLoading(true);

    try {
      const payload: UpdateProfilePayload = {};
      if (fullName !== user?.full_name) payload.full_name = fullName;
      if (email !== user?.email) payload.email = email;
      if (degreeTitle !== (user?.degree_title ?? '')) payload.degree_title = degreeTitle;
      if (university !== (user?.university ?? '')) payload.university = university;
      if (location !== (user?.location ?? '')) payload.location = location;
      if (documentNumber !== (user?.document_number ?? ''))
        payload.document_number = documentNumber;
      if (phone !== (user?.phone ?? '')) payload.phone = phone;
      if (dateOfBirth !== (user?.date_of_birth ?? '')) payload.date_of_birth = dateOfBirth;

      if (Object.keys(payload).length === 0) {
        setProfileError('No hay cambios para guardar');
        return;
      }

      await updateProfile(payload);
      await refreshProfile();
      setProfileSuccess('Perfil actualizado correctamente');
    } catch (err) {
      const error = err as { response?: { data?: { message?: string | string[] } } };
      const msg = error?.response?.data?.message ?? 'Error al actualizar el perfil';
      setProfileError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('La nueva contraseña y la confirmación no coinciden');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }

    setPasswordLoading(true);
    try {
      const payload: ChangePasswordPayload = {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      };
      const result = await changePassword(payload);
      setPasswordSuccess(result.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const error = err as { response?: { data?: { message?: string | string[] } } };
      const msg = error?.response?.data?.message ?? 'Error al cambiar la contraseña';
      setPasswordError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  const inputClass = `w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`;
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
  const tabClass = (tab: Tab) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
      activeTab === tab
        ? 'border-blue-600 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`;

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
          <h2 className="text-base font-semibold text-gray-900">Mi perfil</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          <button className={tabClass('profile')} onClick={() => setActiveTab('profile')}>
            Mis datos
          </button>
          <button className={tabClass('password')} onClick={() => setActiveTab('password')}>
            Cambiar contraseña
          </button>
        </div>

        {/* ── Tab: Mis datos ─────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="px-6 py-5 space-y-6">
            {/* Datos básicos */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Datos básicos
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Nombre completo</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Datos personales */}
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
              </div>
            </div>

            {/* Perfil profesional */}
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

            {profileError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-red-600 text-sm">{profileError}</p>
              </div>
            )}
            {profileSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <p className="text-green-600 text-sm">{profileSuccess}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={profileLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {profileLoading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        )}

        {/* ── Tab: Cambiar contraseña ────────────────────────────── */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="px-6 py-5 space-y-4">
            <div>
              <label className={labelClass}>Contraseña actual</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="••••••••"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Nueva contraseña</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Mínimo 8 caracteres"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Confirmar nueva contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Repite la nueva contraseña"
                className={`${inputClass} ${confirmPassword && newPassword !== confirmPassword ? 'border-red-300 bg-red-50' : ''}`}
              />
              {confirmPassword && (
                <p
                  className={`text-xs mt-1 ${newPassword === confirmPassword ? 'text-green-600' : 'text-red-500'}`}
                >
                  {newPassword === confirmPassword
                    ? '✓ Las contraseñas coinciden'
                    : '✗ Las contraseñas no coinciden'}
                </p>
              )}
            </div>

            {passwordError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-red-600 text-sm">{passwordError}</p>
              </div>
            )}
            {passwordSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <p className="text-green-600 text-sm">{passwordSuccess}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={passwordLoading || (!!confirmPassword && newPassword !== confirmPassword)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {passwordLoading ? 'Cambiando...' : 'Cambiar contraseña'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
