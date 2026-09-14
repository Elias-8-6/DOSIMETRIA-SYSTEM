import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Worker } from '../../api/workers.api';
import { getWorkers } from '../../api/workers.api';
import { assignDosimeter } from '../../api/dosimeters.api';
import { useDebounce } from '../../hooks/useDebounce';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

interface Props {
  dosimeterId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

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
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e?.response?.data?.message ?? 'Error al asignar el dosímetro';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
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
          required
        />
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
            {loading ? 'Asignando...' : 'Asignar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
