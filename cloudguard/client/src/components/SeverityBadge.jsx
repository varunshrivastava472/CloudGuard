import React from 'react';

export default function SeverityBadge({ severity, size = 'md' }) {
  const sev = String(severity || 'LOW').toUpperCase();

  const styles = {
    CRITICAL: {
      badge: 'bg-[#FF4D6D]/12 text-[#FF4D6D] border-[#FF4D6D]/30',
      dot:   'bg-[#FF4D6D] shadow-[0_0_8px_rgba(255,77,109,0.7)]',
    },
    HIGH: {
      badge: 'bg-[#FF8C42]/12 text-[#FF8C42] border-[#FF8C42]/30',
      dot:   'bg-[#FF8C42] shadow-[0_0_8px_rgba(255,140,66,0.7)]',
    },
    MEDIUM: {
      badge: 'bg-[#FACC15]/12 text-[#FACC15] border-[#FACC15]/30',
      dot:   'bg-[#FACC15] shadow-[0_0_8px_rgba(250,204,21,0.7)]',
    },
    LOW: {
      badge: 'bg-[#60A5FA]/12 text-[#60A5FA] border-[#60A5FA]/30',
      dot:   'bg-[#60A5FA] shadow-[0_0_8px_rgba(96,165,250,0.7)]',
    },
  };

  const current      = styles[sev] || styles.LOW;
  const sizeClasses  = size === 'sm'
    ? 'px-2 py-0.5 text-[10px]'
    : 'px-2.5 py-1 text-[11px] font-semibold';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${current.badge} ${sizeClasses} tracking-wider font-mono`}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${current.dot}`} />
      {sev}
    </span>
  );
}
