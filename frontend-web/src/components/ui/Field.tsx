import React from 'react';

interface FieldProps {
  label: string;
  value?: React.ReactNode;
}

export function Field({ label, value }: FieldProps) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm text-gray-800 mt-0.5">{value}</p>
    </div>
  );
}
