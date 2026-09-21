import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import {
  ArrowLeft, AlertCircle, CheckCircle2, Sparkles, Wrench, FileCode, Shield
} from 'lucide-react';
import { findingApi, aiApi } from '../services/api';
import SeverityBadge from '../components/SeverityBadge';
import CodePreview from '../components/CodePreview';
import AttackPathVisualizer from '../components/AttackPathVisualizer';

export default function FindingDetails() {
  const { id }       = useParams();
  const location     = useLocation();

  const [finding,        setFinding]        = useState(location.state?.finding || null);
  const [loading,        setLoading]        = useState(!finding);
  const [error,          setError]          = useState('');
  const [status,         setStatus]         = useState(finding?.status || 'OPEN');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [aiExplanation,  setAiExplanation]  = useState(null);
  const [aiLoading,      setAiLoading]      = useState(false);
  const [aiError,        setAiError]        = useState('');

  const fetchFinding = async () => {
    setLoading(true);
    try {
      const res = await findingApi.getById(id);
      if (res.data?.success) {
        setFinding(res.data.data);
        setStatus(res.data.data.status);
      }
    } catch {
      setError('Failed to retrieve finding details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (!finding) fetchFinding(); }, [id]);

  const handleStatusChange = async (newStatus) => {
    setStatusUpdating(true);
    try {
      const res = await findingApi.updateStatus(id, newStatus);
      if (res.data?.success) {
        setStatus(newStatus);
        setFinding(prev => ({ ...prev, status: newStatus }));
      }
    } catch {
      alert('Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAskAI = async () => {
    if (!finding) return;
    setAiLoading(true);
    setAiError('');
    try {
      const res = await aiApi.explain({ findingId: finding.id || finding._id, finding });
      if (res.data?.success) {
        setAiExplanation(res.data.data);
      } else {
        setAiError(res.data?.message || 'AI explanation unavailable.');
      }
    } catch (err) {
      setAiError(err.response?.data?.message || 'AI Service is in offline mode or key is not configured.');
    } finally {
      setAiLoading(false);
    }
  };

  /* ── Loading / Error ─────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-2 border-cg-primary/30 border-t-cg-primary rounded-full animate-spin" />
        <p className="text-sm font-mono text-cg-muted">Loading finding details...</p>
      </div>
    );
  }

  if (error || !finding) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-[#FF4D6D] mb-4">{error || 'Finding not found'}</p>
        <Link to="/dashboard" className="btn-primary">Back to Dashboard</Link>
      </div>
    );
  }

  const statusColors = {
    OPEN:     { text: 'text-[#FF4D6D]', bg: 'bg-[#FF4D6D]/10 border-[#FF4D6D]/30' },
    RESOLVED: { text: 'text-[#34D399]', bg: 'bg-[#34D399]/10 border-[#34D399]/30' },
    MUTED:    { text: 'text-cg-muted',  bg: 'bg-cg-border/50 border-cg-border' },
  };
  const sc = statusColors[status] || statusColors.OPEN;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slide-up">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-5 border-b border-cg-border">
        <button
          onClick={() => window.history.back()}
          className="btn-ghost"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Results
        </button>

        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${sc.bg} ${sc.text}`}>
            {status}
          </span>
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={statusUpdating}
            className="px-3 py-1.5 rounded-lg bg-cg-surface border border-cg-border
                       text-xs font-mono text-cg-muted focus:outline-none focus:border-cg-primary
                       transition-colors cursor-pointer disabled:opacity-50"
          >
            <option value="OPEN">OPEN</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="MUTED">MUTED</option>
          </select>
        </div>
      </div>

      {/* ── Main Card ──────────────────────────────────────── */}
      <div className="mt-6 card p-6 sm:p-8 shadow-[0_8px_60px_rgba(0,0,0,0.4)]">

        {/* Finding meta */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <SeverityBadge severity={finding.severity} />
          <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg
                           bg-cg-primary/10 text-cg-primary border border-cg-primary/20">
            {finding.ruleId}
          </span>
          <span className="text-xs text-cg-muted font-mono">Category: {finding.category}</span>
        </div>

        <h1 className="text-xl sm:text-2xl font-black font-mono text-cg-text">{finding.title}</h1>

        {/* Resource & Status grid */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-cg-surface border border-cg-border">
            <span className="section-label block mb-2">Affected Resource</span>
            <code className="font-mono text-sm font-bold text-cg-secondary">{finding.resource}</code>
            <span className="block text-xs text-cg-muted font-mono mt-0.5">
              Type: {finding.resourceType || 'Resource'}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-cg-surface border border-cg-border">
            <span className="section-label block mb-2">Detection Status</span>
            <span className="font-mono text-sm font-bold text-cg-success flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Verified Deterministic Rule Match
            </span>
            <span className="block text-xs text-cg-muted font-mono mt-0.5">Zero Hallucination Guarantee</span>
          </div>
        </div>

        {/* Evidence */}
        <div className="mt-6">
          <p className="section-label mb-2.5">Configuration Evidence</p>
          <CodePreview code={finding.evidence} title="Matched Rule Trigger" language="text" />
        </div>

        {/* Threat Impact */}
        <div className="mt-6 p-5 rounded-xl bg-[#FF4D6D]/8 border border-[#FF4D6D]/25">
          <h3 className="text-xs font-mono uppercase tracking-wider text-[#FF4D6D] font-bold mb-2 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            Potential Threat Impact
          </h3>
          <p className="text-sm text-cg-muted leading-relaxed">{finding.impact}</p>
        </div>

        {/* Deterministic Fix */}
        <div className="mt-5 p-5 rounded-xl bg-cg-secondary/8 border border-cg-secondary/25">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <h3 className="text-xs font-mono uppercase tracking-wider text-cg-secondary font-bold flex items-center gap-1.5">
              <Wrench className="w-4 h-4" />
              Deterministic Recommended Fix
            </h3>
          </div>
          <p className="text-sm text-cg-muted leading-relaxed">{finding.remediation}</p>
        </div>

        {/* ── Attack-Path Visualizer Section ───────────────── */}
        <div className="mt-6">
          <AttackPathVisualizer finding={finding} />
        </div>

        {/* ── AI Assistant Section ───────────────────────── */}
        <div className="mt-8 pt-7 border-t border-cg-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="text-base font-bold font-mono text-cg-text flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cg-primary to-[#A78BFA]
                                flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                AI Remediation Assistant
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cg-primary/10
                                 text-cg-primary border border-cg-primary/20 font-mono font-normal">
                  Optional
                </span>
              </h3>
              <p className="text-xs text-cg-muted mt-1 ml-9">
                Generate developer-friendly explanations and corrected configurations using isolated AI.
              </p>
            </div>

            <button
              onClick={handleAskAI}
              disabled={aiLoading}
              className="btn-primary shrink-0 disabled:opacity-50"
            >
              {aiLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Ask AI Assistant</span>
                </>
              )}
            </button>
          </div>

          {aiError && (
            <div className="p-4 rounded-xl bg-cg-surface border border-cg-border text-cg-muted text-xs font-mono">
              <span className="text-cg-primary font-semibold block mb-1">Note:</span>
              {aiError} (The deterministic rule remediation above remains 100% active.)
            </div>
          )}

          {aiExplanation && (
            <div className="mt-4 p-5 rounded-xl bg-cg-primary/8 border border-cg-primary/25 space-y-5 animate-slide-up">
              <div>
                <p className="section-label text-cg-primary mb-2">AI Detailed Explanation</p>
                <p className="text-sm text-cg-muted leading-relaxed whitespace-pre-wrap">
                  {aiExplanation.explanation || aiExplanation}
                </p>
              </div>
              {aiExplanation.fixedConfig && (
                <div>
                  <p className="section-label text-cg-primary mb-2">Corrected Configuration Sample</p>
                  <CodePreview code={aiExplanation.fixedConfig} title="Remediated Template" language="json" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
