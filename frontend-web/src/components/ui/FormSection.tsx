import React from 'react';

interface FormSectionProps {
  label: string;
  color?: string;
  children: React.ReactNode;
}

export function FormSection({ label, color = 'bg-blue-500', children }: FormSectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-1 h-4 rounded-full ${color}`} />
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</h3>
      </div>
      {children}
    </div>
  );
}
