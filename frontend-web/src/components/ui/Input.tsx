import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';

type Accent = 'blue' | 'emerald';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  accent?: Accent;
}

const RING_CLASS: Record<Accent, string> = {
  blue: 'focus:ring-blue-500',
  emerald: 'focus:ring-emerald-500',
};

/** Input con label asociado (htmlFor/id), error inline y texto de ayuda siempre visible. */
export function Input({
  label,
  error,
  helperText,
  accent = 'blue',
  id,
  className = '',
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helperId = helperText ? `${inputId}-helper` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {props.required && (
          <span aria-hidden="true" className="text-red-500">
            {' '}
            *
          </span>
        )}
      </label>
      <input
        id={inputId}
        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent ${RING_CLASS[accent]} ${
          error ? 'border-red-300' : 'border-gray-300'
        } ${className}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={[helperId, errorId].filter(Boolean).join(' ') || undefined}
        {...props}
      />
      {helperText && !error && (
        <p id={helperId} className="text-xs text-gray-400 mt-1">
          {helperText}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-red-600 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
