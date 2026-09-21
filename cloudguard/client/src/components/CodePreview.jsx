import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CodePreview({ code = '', title = 'Configuration Snippet', language = 'json' }) {
  const [copied, setCopied] = useState(false);

  const formattedCode = typeof code === 'object'
    ? JSON.stringify(code, null, 2)
    : String(code || '');

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-cg-border overflow-hidden" style={{ background: '#06060D' }}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5
                      border-b border-cg-border/60 bg-cg-surface/50">
        <div className="flex items-center gap-2.5 text-xs font-mono text-cg-muted">
          {/* Dot accent */}
          <span className="w-2 h-2 rounded-full bg-cg-primary/70" />
          <span>{title}</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-cg-border/60
                           text-cg-muted/70 uppercase tracking-widest">
            {language}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                     bg-cg-border/50 hover:bg-cg-border text-cg-muted
                     hover:text-cg-text text-xs font-mono transition-all duration-150"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-cg-success" />
              <span className="text-cg-success">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code body */}
      <div className="p-4 overflow-x-auto max-h-96 text-xs font-mono leading-relaxed"
           style={{ color: '#22D3EE', opacity: 0.9 }}>
        <pre>{formattedCode}</pre>
      </div>
    </div>
  );
}
