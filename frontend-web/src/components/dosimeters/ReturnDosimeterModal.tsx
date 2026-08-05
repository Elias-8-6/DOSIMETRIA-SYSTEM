import { useState } from 'react';
import type { FormEvent } from 'react';
import type { DosimeterCondition } from '../../api/dosimeters.api';
import { returnDosimeter } from '../../api/dosimeters.api';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

interface Props {
  dosimeterId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const CONDITIONS: { value: DosimeterCondition; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'danado', label: 'Dañado' },
  { value: 'contaminado', label: 'Contaminado' },
  { value: 'perdido', label: 'Perdido' },
];

const today = () => new Date().toISOString().slice(0, 10);

export function ReturnDosimeterModal({ dosimeterId, onClose, onSuccess }: Props) {
  const [returnedAt, setReturnedAt] = useState(today());
  const [condition, setCondition] = useState<DosimeterCondition | ''>('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await returnDosimeter(dosimeterId, {
        returned_at: returnedAt,
        current_condition: condition || undefined,
        notes: notes || undefined,
      });
      onClose();
      onSuccess();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e?.response?.data?.message ?? 'Error al registrar la devolución';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Devolver dosímetro" onClose={onClose} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        <Input
          label="Fecha de devolución"
          type="date"
          value={returnedAt}
          onChange={(e) => setReturnedAt(e.target.value)}
          required
        />
        <Select
          label="Condición al devolver"
          value={condition}
          onChange={(e) => setCondition(e.target.value as DosimeterCondition)}
        >
          <option value="">Sin cambios (mantener actual)</option>
          {CONDITIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Confirmar devolución'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
