import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';
type Accent = 'blue' | 'emerald';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  accent?: Accent;
}

const VARIANT_CLASSES: Record<Variant, Record<Accent, string>> = {
  primary: {
    blue: 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white',
    emerald: 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white',
  },
  secondary: {
    blue: 'text-gray-600 border border-gray-300 hover:border-gray-400 bg-white disabled:opacity-50',
    emerald:
      'text-gray-600 border border-gray-300 hover:border-gray-400 bg-white disabled:opacity-50',
  },
  danger: {
    blue: 'bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white',
    emerald: 'bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white',
  },
};

/** Botón compartido: variant controla el rol visual, accent el color de marca del módulo. */
export function Button({
  variant = 'primary',
  accent = 'blue',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed ${VARIANT_CLASSES[variant][accent]} ${className}`}
      {...props}
    />
  );
}
