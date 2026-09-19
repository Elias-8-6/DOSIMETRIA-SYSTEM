import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Worker } from '../../api/workers.api';
import { getWorkers } from '../../api/workers.api';
import { assignDosimeter } from '../../api/dosimeters.api';
import { useDebounce } from '../../hooks/useDebounce';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { FormFooter } from '../ui/FormFooter';
import { extractApiError } from '../../utils/api';
import { today } from '../../utils/date';
import { isDateNotFuture } from '../../utils/validation';

interface Props {
  dosimeterId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignDosimeterModal({ dosimeterId, onClose, onSuccess }: Props) {
  const [search, setSearch] = useState('');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workerId, setWorkerId] = useState('');
  const [assignedAt, setAssignedAt] = useState(today());
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    getWorkers({ search: debouncedSearch || undefined, status: 'active', limit: 20 })
      .then((res) => setWorkers(res.items))
      .catch(() => setWorkers([]));
  }, [debouncedSearch]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!workerId) {
      setError('Seleccioná un trabajador');
      return;
    }
    if (!isDateNotFuture(assignedAt)) {
      setError('La fecha de asignación no puede ser una fecha futura');
      return;
    }
    setLoading(true);
    try {
      await assignDosimeter(dosimeterId, {
        worker_id: workerId,
        assigned_at: assignedAt,
        notes: notes || undefined,
      });
      onClose();
      onSuccess();
    } catch (err) {
      setError(extractApiError(err, 'Error al asignar el dosímetro'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Asignar dosímetro" onClose={onClose} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        <Input
          label="Buscar trabajador"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nombre o documento..."
        />
        <Select
          label="Trabajador"
          value={workerId}
          onChange={(e) => setWorkerId(e.target.value)}
          required
        >
          <option value="">Seleccionar trabajador</option>
          {workers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.full_name} — {w.clients?.name ?? 'Sin institución'}
            </option>
          ))}
        </Select>
        <Input
          label="Fecha de asignación"
          type="date"
          value={assignedAt}
          onChange={(e) => setAssignedAt(e.target.value)}
          max={today()}
          required
        />
        <Textarea
          label="Notas"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />

        <FormFooter
          error={error}
          loading={loading}
          submitLabel={loading ? 'Asignando...' : 'Asignar'}
          onClose={onClose}
        />
      </form>
    </Modal>
  );
}
