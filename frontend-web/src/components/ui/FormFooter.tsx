import { Button } from './Button';

interface FormFooterProps {
  error?: string;
  loading: boolean;
  isEditing?: boolean;
  submitLabel?: string;
  editLabel?: string;
  createLabel?: string;
  onClose: () => void;
}

export function FormFooter({
  error,
  loading,
  isEditing = false,
  submitLabel,
  editLabel = 'Guardar cambios',
  createLabel = 'Guardar',
  onClose,
}: FormFooterProps) {
  const resolvedSubmitText = loading
    ? 'Guardando...'
    : submitLabel ?? (isEditing ? editLabel : createLabel);

  return (
    <div className="space-y-4 pt-2 border-t border-gray-100">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
      <div className="flex justify-end gap-3">
        <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {resolvedSubmitText}
        </Button>
      </div>
    </div>
  );
}
