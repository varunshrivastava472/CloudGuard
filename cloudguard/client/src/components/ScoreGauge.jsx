import React from 'react';

export default function ScoreGauge({ score = 100, label = 'CloudGuard Score', totalPenalty = 0 }) {
  const normalizedScore = Math.max(0, Math.min(100, Number(score) || 0));

  let strokeColor  = '#34D399';
  let glowClass    = 'glow-success';
  let statusText   = 'Optimal Posture';
  let statusClass  = 'bg-[#34D399]/12 text-[#34D399] border-[#34D399]/30';
  let labelColor   = 'text-[#34D399]';

  if (normalizedScore < 50) {
    strokeColor  = '#FF4D6D';
    glowClass    = 'glow-danger';
    statusText   = 'Critical Exposure';
    statusClass  = 'bg-[#FF4D6D]/12 text-[#FF4D6D] border-[#FF4D6D]/30';
    labelColor   = 'text-[#FF4D6D]';
  } else if (normalizedScore < 80) {
    strokeColor  = '#FACC15';
    glowClass    = 'glow-amber';
    statusText   = 'Risks Detected';
    statusClass  = 'bg-[#FACC15]/12 text-[#FACC15] border-[#FACC15]/30';
    labelColor   = 'text-[#FACC15]';
  }

  const radius          = 42;
  const circumference   = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  return (
    <div className={`flex flex-col items-center justify-center p-6 rounded-2xl
                     bg-cg-card border border-cg-border ${glowClass}
                     relative overflow-hidden transition-all duration-300`}>

      {/* Background radial gradient */}
      <div className="absolute inset-0 opacity-20 pointer-events-none"
           style={{ background: `radial-gradient(circle at 50% 50%, ${strokeColor}22, transparent 70%)` }} />

      {/* SVG Gauge */}
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Track ring */}
          <circle cx="50" cy="50" r={radius}
                  stroke="#292A42" strokeWidth="7"
                  fill="transparent" />
          {/* Score arc */}
          <circle cx="50" cy="50" r={radius}
                  stroke={strokeColor}
                  strokeWidth="7"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                  style={{ filter: `drop-shadow(0 0 6px ${strokeColor}80)` }} />
        </svg>

        {/* Center value */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className={`text-3xl font-extrabold font-mono tracking-tight ${labelColor}`}>
            {normalizedScore}
          </span>
          <span className="text-[10px] uppercase font-semibold text-cg-muted tracking-wider">
            / 100
          </span>
        </div>
      </div>

      {/* Label & Status */}
      <div className="mt-4 text-center relative z-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-cg-muted font-mono">
          {label}
        </p>
        <span className={`inline-block mt-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold border ${statusClass}`}>
          {statusText}
        </span>
        {totalPenalty > 0 && (
          <p className="text-[10px] text-cg-muted mt-1.5 font-mono">
            Penalty: <span className="text-[#FF4D6D] font-bold">-{totalPenalty} pts</span>
          </p>
        )}
      </div>
    </div>
  );
}
