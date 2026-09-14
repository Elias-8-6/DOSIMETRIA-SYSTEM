import { useId } from 'react';
import type { SelectHTMLAttributes } from 'react';

type Accent = 'blue' | 'emerald';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  accent?: Accent;
}

const RING_CLASS: Record<Accent, string> = {
  blue: 'focus:ring-blue-500',
  emerald: 'focus:ring-emerald-500',
};

/** Select con label asociado (htmlFor/id) y error inline, mismo patrón que Input. */
export function Select({
  label,
  error,
  accent = 'blue',
  id,
  className = '',
  children,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const errorId = error ? `${selectId}-error` : undefined;

  return (
    <div>
      <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {props.required && (
          <span aria-hidden="true" className="text-red-500">
            {' '}
            *
          </span>
        )}
      </label>
      <select
        id={selectId}
        className={`w-full px-3 py-2 border rounded-lg text-sm bg-white cursor-pointer focus:outline-none focus:ring-2 focus:border-transparent ${RING_CLASS[accent]} ${
          error ? 'border-red-300' : 'border-gray-300'
        } ${className}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p id={errorId} className="text-xs text-red-600 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
