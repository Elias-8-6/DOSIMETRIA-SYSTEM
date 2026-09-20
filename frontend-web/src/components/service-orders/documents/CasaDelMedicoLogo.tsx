export function CasaDelMedicoLogo({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <svg
        viewBox="0 0 100 120"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Wings */}
        <path d="M50 35 C35 20, 10 25, 5 45 C15 48, 35 48, 50 38" fill="#1e3a8a" fillOpacity="0.15" stroke="#1e3a8a" />
        <path d="M50 35 C65 20, 90 25, 95 45 C85 48, 65 48, 50 38" fill="#1e3a8a" fillOpacity="0.15" stroke="#1e3a8a" />
        {/* Central staff */}
        <line x1="50" y1="12" x2="50" y2="108" stroke="#1e3a8a" strokeWidth="4" />
        <circle cx="50" cy="12" r="5" fill="#1e3a8a" stroke="#1e3a8a" />
        {/* Snake 1 */}
        <path
          d="M50 95 C30 85, 30 65, 50 55 C70 45, 70 25, 50 22"
          stroke="#1e3a8a"
          strokeWidth="3.5"
          fill="none"
        />
        {/* Snake 2 */}
        <path
          d="M50 95 C70 85, 70 65, 50 55 C30 45, 30 25, 50 22"
          stroke="#1e3a8a"
          strokeWidth="3.5"
          fill="none"
        />
      </svg>
      <span className="text-[9px] font-extrabold uppercase tracking-tighter text-blue-950 leading-tight mt-0.5">
        LA CASA<br />DEL MEDICO
      </span>
    </div>
  );
}
