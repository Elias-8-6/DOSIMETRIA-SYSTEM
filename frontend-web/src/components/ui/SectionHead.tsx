import React from 'react';

interface SectionHeadProps {
  label: string;
  action?: React.ReactNode;
}

export function SectionHead({ label, action }: SectionHeadProps) {
  if (action) {
    return (
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</h2>
        {action}
      </div>
    );
  }
  return (
    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{label}</h2>
  );
}
