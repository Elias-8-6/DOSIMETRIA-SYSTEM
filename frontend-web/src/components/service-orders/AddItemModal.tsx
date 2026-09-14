import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Dosimeter } from '../../api/dosimeters.api';
import { getDosimeters } from '../../api/dosimeters.api';
import type { RequestedAction } from '../../api/serviceOrders.api';
import { addServiceOrderItem } from '../../api/serviceOrders.api';
import { useDebounce } from '../../hooks/useDebounce';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

interface Props {
  orderId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const REQUESTED_ACTIONS: { value: RequestedAction; label: string }[] = [
  { value: 'lectura', label: 'Lectura' },
  { value: 'limpieza', label: 'Limpieza' },
  { value: 'recarga', label: 'Recarga' },
  { value: 'inspeccion', label: 'Inspección' },
];

export function AddItemModal({ orderId, onClose, onSuccess }: Props) {
  const [search, setSearch] = useState('');
  const [dosimeters, setDosimeters] = useState<Dosimeter[]>([]);
  const [dosimeterId, setDosimeterId] = useState('');
  const [requestedAction, setRequestedAction] = useState<RequestedAction>('lectura');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    getDosimeters({ search: debouncedSearch || undefined, limit: 20 })
      .then((res) => setDosimeters(res.items))
      .catch(() => setDosimeters([]));
  }, [debouncedSearch]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!dosimeterId) {
      setError('Seleccioná un dosímetro');
      return;
    }
    setLoading(true);
    try {
      await addServiceOrderItem(orderId, { dosimeter_id: dosimeterId, requested_action: requestedAction });
      onClose();
      onSuccess();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e?.response?.data?.message ?? 'Error al agregar el dosímetro';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Agregar dosímetro" onClose={onClose} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        <Input
          label="Buscar dosímetro"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Serie o código interno..."
        />
        <Select
          label="Dosímetro"
          value={dosimeterId}
          onChange={(e) => setDosimeterId(e.target.value)}
          required
        >
          <option value="">Seleccionar dosímetro</option>
          {dosimeters.map((d) => (
            <option key={d.id} value={d.id}>
              {d.serial_number} {d.internal_code ? `(${d.internal_code})` : ''}
            </option>
          ))}
        </Select>
        <Select
          label="Acción solicitada"
          value={requestedAction}
          onChange={(e) => setRequestedAction(e.target.value as RequestedAction)}
          required
        >
          {REQUESTED_ACTIONS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </Select>

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
            {loading ? 'Agregando...' : 'Agregar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
