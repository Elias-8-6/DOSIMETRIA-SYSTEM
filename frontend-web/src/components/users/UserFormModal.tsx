import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { createUser, updateUser } from '../../api/users.api';
import type { User, CreateUserPayload, UpdateUserPayload } from '../../api/users.api';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

interface Props {
  user?: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;
const PASSWORD_HELPER = 'Mínimo 12 caracteres, con mayúscula, minúscula, número y símbolo';

/**
 * UserFormModal — crear y editar usuarios.
 * El rol es SIEMPRE obligatorio (crear y editar).
 * Cédula/DNI y Teléfono son obligatorios al crear (el backend los exige).
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
    // Solo re-sincronizar cuando cambia a OTRO usuario, no en cada
    // re-render con la misma referencia de user desde el padre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        if (!PASSWORD_REGEX.test(password)) {
          setError(
            'La contraseña debe tener al menos 12 caracteres, incluyendo mayúscula, minúscula, número y símbolo',
          );
          setLoading(false);
          return;
        }

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

  return (
    <Modal title={isEditing ? 'Editar usuario' : 'Nuevo usuario'} onClose={onClose}>
      <form autoComplete="off" onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
        {/* ── Sección: Datos básicos ────────────────────────────── */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Datos básicos
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre completo"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Juan Pérez"
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="juan@laboratorio.com"
            />

            {/* Password solo en creación */}
            {!isEditing && (
              <Input
                label="Contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                helperText={PASSWORD_HELPER}
              />
            )}

            {/* Rol — siempre requerido */}
            <Select
              label="Rol"
              value={roleCode}
              onChange={(e) => setRoleCode(e.target.value)}
              required
            >
              <option value="">Seleccionar rol</option>
              <option value="admin_lab">Administrador del laboratorio</option>
              <option value="tecnico_lab">Técnico de laboratorio</option>
              <option value="coordinador_cliente">Coordinador de cliente</option>
              <option value="auditor">Auditor ISO</option>
            </Select>
          </div>
        </div>

        {/* ── Sección: Datos personales ─────────────────────────── */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Datos personales
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Cédula / DNI"
              type="text"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              required={!isEditing}
              placeholder="8-123-456"
            />
            <Input
              label="Teléfono"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required={!isEditing}
              placeholder="+507 6000-0000"
            />
            <Input
              label="Fecha de nacimiento"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
            <Input
              label="Fecha de contratación"
              type="date"
              value={hireDate}
              onChange={(e) => setHireDate(e.target.value)}
            />
          </div>
        </div>

        {/* ── Sección: Perfil profesional ───────────────────────── */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Perfil profesional
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Título universitario"
              type="text"
              value={degreeTitle}
              onChange={(e) => setDegreeTitle(e.target.value)}
              placeholder="Lic. en Física"
            />
            <Input
              label="Universidad"
              type="text"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              placeholder="Universidad de Panamá"
            />
            <div className="col-span-2">
              <Input
                label="Ubicación"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ciudad de Panamá"
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
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading
              ? isEditing
                ? 'Guardando...'
                : 'Creando...'
              : isEditing
                ? 'Guardar cambios'
                : 'Crear usuario'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
