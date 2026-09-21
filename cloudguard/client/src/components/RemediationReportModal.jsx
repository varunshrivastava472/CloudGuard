import React from 'react';
import {
  ShieldCheck, Download, CheckCircle2, AlertTriangle,
  X, ArrowRight, FileText, Check, Clock, Calendar
} from 'lucide-react';
import SeverityBadge from './SeverityBadge';
import { generateRemediationPdf } from '../utils/pdfReportGenerator';

export default function RemediationReportModal({ report, onClose }) {
  if (!report) return null;

  const handleDownload = () => {
    generateRemediationPdf(report);
  };

  const initialScore = report.initialScore ?? 0;
  const finalScore = report.finalScore ?? 100;
  const delta = Math.max(0, finalScore - initialScore);

  const findingsResolved = report.findingsResolved || [];
  const findingsRemaining = report.findingsRemaining || [];
  const remediationSummary = report.remediationSummary || [];
  const dateFormatted = new Date(report.timestamp || Date.now()).toLocaleString();

  return (
    <div className="fixed inset-0 z-50 bg-cg-bg/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-4xl card p-6 sm:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.7)] space-y-6 animate-slide-up my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-cg-border">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#34D399]/15 border border-[#34D399]/30
                            flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-[#34D399]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black font-mono text-cg-text">
                  Verified Remediation Report
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#34D399]/20 text-[#34D399]
                                 border border-[#34D399]/40 font-mono font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {report.verificationStatus || 'DETERMINISTIC RE-SCAN VERIFIED'}
                </span>
              </div>
              <p className="text-xs text-cg-muted font-mono mt-1 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-cg-secondary" />
                Verified at {dateFormatted} • Configuration: {report.fileName || 'cloud-config.json'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-cg-muted hover:text-cg-text hover:bg-cg-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score Comparison Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 rounded-2xl bg-cg-surface/80 border border-cg-border">
          <div>
            <span className="section-label">Initial Score</span>
            <div className="text-3xl font-black font-mono text-[#FF4D6D] mt-1">
              {initialScore}
              <span className="text-xs text-cg-muted font-normal"> / 100</span>
            </div>
            <span className="text-[11px] font-mono text-cg-muted">Before remediation</span>
          </div>

          <div>
            <span className="section-label text-[#34D399]">Final Verified Score</span>
            <div className="text-3xl font-black font-mono text-[#34D399] mt-1 flex items-center gap-2">
              {finalScore}
              <span className="text-xs text-cg-muted font-normal"> / 100</span>
              {delta > 0 && (
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full
                                 bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30">
                  +{delta} pts
                </span>
              )}
            </div>
            <span className="text-[11px] font-mono text-cg-muted">After deterministic re-scan</span>
          </div>

          <div>
            <span className="section-label">Resolution Status</span>
            <div className="text-2xl font-black font-mono text-cg-text mt-1">
              {findingsResolved.length} Resolved
            </div>
            <span className="text-[11px] font-mono text-cg-muted">
              {findingsRemaining.length} remaining requiring review
            </span>
          </div>
        </div>

        {/* Exact Remediation Summary */}
        <div>
          <h3 className="section-label mb-2 flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-[#34D399]" />
            Exact Remediation Summary ({remediationSummary.length} Actions)
          </h3>
          <div className="p-4 rounded-xl bg-[#06060D] border border-cg-border/80 space-y-2 font-mono text-xs text-cg-secondary/90">
            {remediationSummary.length > 0 ? (
              remediationSummary.map((action, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-[#34D399] font-bold">✓</span>
                  <span>{action}</span>
                </div>
              ))
            ) : (
              <span className="text-cg-muted italic">No automated remediation actions logged.</span>
            )}
          </div>
        </div>

        {/* Findings Resolved */}
        {findingsResolved.length > 0 && (
          <div>
            <h3 className="section-label mb-2 text-[#34D399]">
              Resolved Findings ({findingsResolved.length})
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {findingsResolved.map((f, i) => (
                <div key={i} className="p-3 rounded-lg bg-[#34D399]/5 border border-[#34D399]/20 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={f.severity} />
                    <span className="font-mono text-cg-primary font-bold">{f.ruleId}</span>
                    <span className="text-cg-text font-medium truncate">{f.title}</span>
                  </div>
                  <span className="font-mono text-[11px] text-cg-muted shrink-0">
                    {f.resource}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Findings Remaining */}
        {findingsRemaining.length > 0 && (
          <div>
            <h3 className="section-label mb-2 text-[#FACC15]">
              Remaining Findings ({findingsRemaining.length})
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {findingsRemaining.map((f, i) => (
                <div key={i} className="p-3 rounded-lg bg-[#FACC15]/5 border border-[#FACC15]/20 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={f.severity} />
                    <span className="font-mono text-cg-primary font-bold">{f.ruleId}</span>
                    <span className="text-cg-text font-medium truncate">{f.title}</span>
                  </div>
                  <span className="font-mono text-[11px] text-cg-muted shrink-0">
                    {f.resource}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audit Footer & Download Button */}
        <div className="pt-4 border-t border-cg-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[11px] font-mono text-cg-muted">
            Certified by CloudGuard Deterministic Rule Engine • Zero Hallucinations Guarantee
          </p>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="btn-ghost"
            >
              Close
            </button>
            <button
              onClick={handleDownload}
              className="btn-primary"
              style={{ background: 'linear-gradient(135deg, #34D399 0%, #059669 100%)' }}
            >
              <Download className="w-4 h-4" />
              <span>Download PDF Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
