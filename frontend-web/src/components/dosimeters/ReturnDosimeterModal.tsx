import { useState } from 'react';
import type { FormEvent } from 'react';
import type { DosimeterCondition } from '../../api/dosimeters.api';
import { returnDosimeter } from '../../api/dosimeters.api';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { FormFooter } from '../ui/FormFooter';
import { CONDITIONS } from '../../constants/dosimeters';
import { extractApiError } from '../../utils/api';
import { today } from '../../utils/date';

interface Props {
  dosimeterId: string;
  onClose: () => void;
  onSuccess: () => void;
}

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
      setError(extractApiError(err, 'Error al registrar la devolución'));
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
        <Textarea
          label="Notas"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />

        <FormFooter
          error={error}
          loading={loading}
          submitLabel={loading ? 'Guardando...' : 'Confirmar devolución'}
          onClose={onClose}
        />
      </form>
    </Modal>
  );
}
