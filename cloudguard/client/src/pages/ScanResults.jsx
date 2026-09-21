import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import {
  Shield, AlertOctagon, AlertTriangle, Info, CheckCircle2,
  Filter, RefreshCw, ArrowLeft, Wrench, Sparkles, Eye, X, ChevronDown,
  Zap, FileText, Download, SlidersHorizontal
} from 'lucide-react';
import { scanApi, findingApi } from '../services/api';
import ScoreGauge from '../components/ScoreGauge';
import SeverityBadge from '../components/SeverityBadge';
import CodePreview from '../components/CodePreview';
import AttackPathVisualizer from '../components/AttackPathVisualizer';
import WhatIfSimulator from '../components/WhatIfSimulator';
import RemediationReportModal from '../components/RemediationReportModal';
import { generateRemediationPdf } from '../utils/pdfReportGenerator';

/* ── Mini metric card ──────────────────────────────────── */
function FindingsMetric({ label, count, color, penalty }) {
  return (
    <div className="card p-4 flex flex-col justify-between"
         style={{ borderColor: `${color}25` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="section-label">{label}</span>
      </div>
      <span className="text-2xl font-extrabold font-mono" style={{ color }}>
        {count}
      </span>
      <span className="text-[10px] text-cg-muted/60 font-mono mt-0.5">{penalty}</span>
    </div>
  );
}

export default function ScanResults() {
  const { id }       = useParams();
  const location     = useLocation();

  const [scan,                 setScan]                 = useState(location.state?.scanResult?.scan     || null);
  const [findings,             setFindings]             = useState(location.state?.scanResult?.findings  || []);
  const [resources,            setResources]            = useState(location.state?.scanResult?.resources || []);
  const [loading,              setLoading]              = useState(!scan);
  const [error,                setError]                = useState('');
  const [remediating,          setRemediating]          = useState(false);
  const [remediationResult,    setRemediationResult]    = useState(null);
  const [previewDiff,          setPreviewDiff]          = useState(null);
  const [severityFilter,       setSeverityFilter]       = useState('ALL');
  const [categoryFilter,       setCategoryFilter]       = useState('ALL');
  const [statusFilter,         setStatusFilter]         = useState('ALL');
  const [expandedAttackPaths,  setExpandedAttackPaths]  = useState({});
  const [isSimulatorOpen,      setIsSimulatorOpen]      = useState(false);
  const [activeReportModal,    setActiveReportModal]    = useState(null);
  const [viewMode,             setViewMode]             = useState('CARDS'); // 'CARDS' | 'ATTACK_PATHS'

  const fetchScanDetails = async () => {
    setLoading(true);
    try {
      const res = await scanApi.getScanById(id);
      if (res.data?.success) {
        setScan(res.data.data.scan);
        setFindings(res.data.data.findings || []);
        setResources(res.data.data.resources || []);
      }
    } catch {
      setError('Failed to fetch scan results.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (!scan) fetchScanDetails(); }, [id]);

  const handleStatusChange = async (findingId, newStatus) => {
    try {
      await findingApi.updateStatus(findingId, newStatus);
      setFindings(prev => {
        const updated = prev.map(f => (f.id === findingId || f._id === findingId) ? { ...f, status: newStatus } : f);
        const active  = updated.filter(f => (f.status || 'OPEN') !== 'RESOLVED');
        const penalty = active.reduce((sum, f) => {
          const p = f.severity === 'CRITICAL' ? 20 : f.severity === 'HIGH' ? 10 : f.severity === 'MEDIUM' ? 5 : 2;
          return sum + p;
        }, 0);
        setScan(s => s ? { ...s, securityScore: Math.max(0, 100 - penalty), totalPenalty: penalty } : s);
        return updated;
      });
    } catch {
      alert('Failed to update finding status');
    }
  };

  const handleAutoRemediate = async (findingId = null, selectedIds = null) => {
    const scanId = scan.id || scan._id || id;
    setRemediating(true);
    try {
      let payload = { autoFixAll: true };
      if (findingId) {
        payload = { findingId };
      } else if (selectedIds && selectedIds.length > 0) {
        payload = { selectedFindingIds: selectedIds };
      }

      const res = await scanApi.applyFix(scanId, payload);
      if (res.data?.success) {
        const data = res.data.data;
        setRemediationResult(data);
        setScan(data.scan);
        setFindings(data.findings || []);
        setResources(data.resources || []);
        if (data.remediationReport) {
          setActiveReportModal(data.remediationReport);
        }
        setIsSimulatorOpen(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to apply remediation');
    } finally {
      setRemediating(false);
    }
  };

  const toggleAttackPath = (findingId) => {
    setExpandedAttackPaths(prev => ({
      ...prev,
      [findingId]: !prev[findingId]
    }));
  };

  const handleOpenRemediationReport = async () => {
    if (remediationResult?.remediationReport) {
      setActiveReportModal(remediationResult.remediationReport);
      return;
    }
    try {
      const scanId = scan.id || scan._id || id;
      const res = await scanApi.getRemediationReport(scanId);
      if (res.data?.success) {
        setActiveReportModal(res.data.data);
      }
    } catch {
      alert('Failed to retrieve verified remediation report');
    }
  };

  const remainingFindings = findings.filter(f => (f.status || 'OPEN') !== 'RESOLVED');
  const remainingCount    = remainingFindings.length;

  const remediationMessage = remainingCount === 0
    ? 'All misconfigurations have been patched and verified via deterministic re-scan.'
    : `Remediation applied successfully. ${remainingCount} findings remain and require attention.`;

  const filteredFindings = findings.filter(f => {
    if (severityFilter !== 'ALL' && f.severity !== severityFilter) return false;
    if (categoryFilter !== 'ALL' && f.category?.toLowerCase() !== categoryFilter.toLowerCase()) return false;
    if (statusFilter   !== 'ALL' && f.status !== statusFilter) return false;
    return true;
  });

  const categories = ['ALL', ...new Set(findings.map(f => f.category).filter(Boolean))];

  /* ── Loading ──────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-2 border-cg-primary/30 border-t-cg-primary rounded-full animate-spin" />
        <p className="text-sm font-mono text-cg-muted">Loading verified security findings...</p>
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p className="text-[#FF4D6D] mb-4">{error || 'Scan not found'}</p>
        <Link to="/scan/new" className="btn-primary">Start New Scan</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slide-up">

      {/* ── Breadcrumb & Actions ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-cg-border">
        <div className="flex items-center gap-3">
          <Link
            to="/history"
            className="btn-ghost p-2.5"
            title="Back to history"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-black font-mono text-cg-text flex items-center gap-2.5 flex-wrap">
              <span>{scan.fileName}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-lg bg-cg-border text-cg-muted
                               border border-cg-border uppercase font-normal">
                {scan.fileType}
              </span>
            </h1>
            <p className="text-xs font-mono text-cg-muted mt-0.5">
              Scanned {new Date(scan.createdAt).toLocaleString()} • Provider: {scan.provider}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* What-If Simulator Toggle */}
          <button
            onClick={() => setIsSimulatorOpen(!isSimulatorOpen)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
              isSimulatorOpen
                ? 'bg-cg-secondary text-[#07070C] font-bold shadow-[0_0_18px_rgba(34,211,238,0.45)]'
                : 'bg-cg-secondary/10 hover:bg-cg-secondary/20 text-cg-secondary border border-cg-secondary/30'
            }`}
            title="Simulate remediation fixes without modifying configuration"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isSimulatorOpen ? 'Exit Simulator' : 'Simulate Fixes'}</span>
          </button>

          {/* Verified Report Button */}
          {(remediationResult?.remediationReport || scan.remediationReport || scan.parentScanId) && (
            <button
              onClick={handleOpenRemediationReport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold
                         bg-[#34D399]/15 hover:bg-[#34D399]/25 text-[#34D399] border border-[#34D399]/30 transition-all cursor-pointer"
              title="View Verified Remediation Report and Download PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Verified Report</span>
            </button>
          )}

          {remainingCount > 0 ? (
            <button
              onClick={() => handleAutoRemediate(null)}
              disabled={remediating}
              className="btn-primary disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #34D399, #059669)' }}
            >
              {remediating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Remediating & Re-scanning...</span>
                </>
              ) : (
                <>
                  <Wrench className="w-4 h-4" />
                  <span>Auto-Remediate All & Re-Scan</span>
                </>
              )}
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl
                            bg-[#34D399]/10 border border-[#34D399]/30 text-[#34D399] font-mono text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              Fully Remediated
            </div>
          )}
          <Link
            to="/scan/new"
            className="btn-ghost"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cg-secondary" />
            New Scan
          </Link>
        </div>
      </div>

      {/* ── Remediation Banner ──────────────────────────────── */}
      {remediationResult && (
        <div
          id="remediation-banner"
          data-remaining-findings={remainingCount}
          className={`mt-6 p-5 rounded-2xl border flex flex-col md:flex-row md:items-center
                      justify-between gap-4 transition-all animate-slide-up ${
            remainingCount === 0
              ? 'bg-[#34D399]/8 border-[#34D399]/30 glow-success'
              : 'bg-[#FACC15]/8 border-[#FACC15]/30 glow-amber'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              remainingCount === 0
                ? 'bg-[#34D399]/15 border border-[#34D399]/30'
                : 'bg-[#FACC15]/15 border border-[#FACC15]/30'
            }`}>
              {remainingCount === 0
                ? <CheckCircle2 className="w-5 h-5 text-[#34D399]" />
                : <AlertTriangle className="w-5 h-5 text-[#FACC15]" />
              }
            </div>
            <div>
              <h3 className="text-sm font-bold text-cg-text font-mono flex items-center gap-2">
                {remainingCount === 0 ? 'Remediation Applied Successfully!' : 'Remediation Applied (Findings Remaining)'}
                {remediationResult.scoreImprovement > 0 && (
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border font-mono ${
                    remainingCount === 0
                      ? 'bg-[#34D399]/15 text-[#34D399] border-[#34D399]/30'
                      : 'bg-[#FACC15]/15 text-[#FACC15] border-[#FACC15]/30'
                  }`}>
                    +{remediationResult.scoreImprovement} pts
                  </span>
                )}
              </h3>
              <p className="text-xs text-cg-muted mt-1">
                Score improved from{' '}
                <span className="text-cg-text font-mono font-bold">{remediationResult.originalScore}</span>
                {' → '}
                <span className="text-cg-text font-mono font-bold">{scan.securityScore}/100</span>.{' '}
                <span id="remediation-banner-message" className={`font-medium ${
                  remainingCount === 0 ? 'text-[#34D399]' : 'text-[#FACC15]'
                }`}>
                  {remediationMessage}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleOpenRemediationReport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold
                         bg-[#34D399]/20 hover:bg-[#34D399]/30 text-[#34D399] border border-[#34D399]/40 transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Verified Report & PDF</span>
            </button>
            <button
              onClick={() => setPreviewDiff(remediationResult.remediatedConfig)}
              className="btn-ghost shrink-0 text-xs"
            >
              View Patched Config
            </button>
          </div>
        </div>
      )}

      {/* ── Security What-If Simulator Panel ─────────────────── */}
      {isSimulatorOpen && (
        <div className="mt-6 animate-slide-up">
          <WhatIfSimulator
            scan={scan}
            findings={findings}
            onApplyFixes={(selectedIds) => handleAutoRemediate(null, selectedIds)}
            onClose={() => setIsSimulatorOpen(false)}
            isApplying={remediating}
          />
        </div>
      )}

      {/* ── Score & Metrics ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 mt-6">
        <ScoreGauge
          score={scan.securityScore}
          totalPenalty={scan.totalPenalty}
          label={scan.scoreLabel || 'CloudGuard Score'}
        />
        <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <FindingsMetric label="Critical" color="#FF4D6D" penalty="-20 pts"
            count={findings.filter(f => f.severity === 'CRITICAL' && (f.status || 'OPEN') !== 'RESOLVED').length} />
          <FindingsMetric label="High"     color="#FF8C42" penalty="-10 pts"
            count={findings.filter(f => f.severity === 'HIGH'     && (f.status || 'OPEN') !== 'RESOLVED').length} />
          <FindingsMetric label="Medium"   color="#FACC15" penalty="-5 pts"
            count={findings.filter(f => f.severity === 'MEDIUM'   && (f.status || 'OPEN') !== 'RESOLVED').length} />
          <FindingsMetric label="Low"      color="#60A5FA" penalty="-2 pts"
            count={findings.filter(f => f.severity === 'LOW'      && (f.status || 'OPEN') !== 'RESOLVED').length} />
        </div>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────── */}
      <div className="mt-6 card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono text-cg-muted">
            <Filter className="w-3.5 h-3.5 text-cg-primary" />
            Severity:
          </div>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all duration-150 cursor-pointer ${
                severityFilter === sev
                  ? 'bg-cg-primary text-white font-bold shadow-[0_0_12px_-2px_rgba(124,92,255,0.5)]'
                  : 'bg-cg-surface text-cg-muted hover:bg-cg-border hover:text-cg-text'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-cg-surface p-1 rounded-xl border border-cg-border">
            <button
              type="button"
              onClick={() => setViewMode('CARDS')}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                viewMode === 'CARDS'
                  ? 'bg-cg-card text-cg-text font-bold shadow-sm'
                  : 'text-cg-muted hover:text-cg-text'
              }`}
            >
              Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode('ATTACK_PATHS')}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'ATTACK_PATHS'
                  ? 'bg-cg-card text-cg-secondary font-bold shadow-sm'
                  : 'text-cg-muted hover:text-cg-text'
              }`}
            >
              <Zap className="w-3 h-3 text-cg-secondary" />
              <span>Attack-Path Topology</span>
            </button>
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-cg-surface border border-cg-border
                       text-cg-muted text-xs font-mono focus:outline-none focus:border-cg-primary
                       transition-colors cursor-pointer"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>Category: {cat}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-cg-surface border border-cg-border
                       text-cg-muted text-xs font-mono focus:outline-none focus:border-cg-primary
                       transition-colors cursor-pointer"
          >
            <option value="ALL">Status: ALL</option>
            <option value="OPEN">Status: OPEN</option>
            <option value="RESOLVED">Status: RESOLVED</option>
            <option value="MUTED">Status: MUTED</option>
          </select>
        </div>
      </div>

      {/* ── Findings Section ─────────────────────────────────── */}
      {viewMode === 'ATTACK_PATHS' ? (
        /* Attack-Path Topology View */
        <div className="mt-5 space-y-4">
          {filteredFindings.length > 0 ? (
            filteredFindings.map((finding) => (
              <div key={finding.id || finding._id} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={finding.severity} />
                    <span className="font-mono text-xs font-bold text-cg-primary">{finding.ruleId}</span>
                    <span className="text-xs font-bold text-cg-text">{finding.title}</span>
                  </div>
                  <Link
                    to={`/findings/${finding.id || finding._id}`}
                    state={{ finding }}
                    className="text-xs font-mono text-cg-secondary hover:underline flex items-center gap-1"
                  >
                    Inspect Details →
                  </Link>
                </div>
                <AttackPathVisualizer finding={finding} />
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 rounded-2xl
                            border border-dashed border-cg-border bg-cg-card/30 text-center">
              <CheckCircle2 className="w-8 h-8 text-cg-success mb-3" />
              <p className="text-base font-bold text-cg-text">No Attack Paths Active</p>
              <p className="text-xs text-cg-muted mt-1 font-mono">
                All misconfigurations in this view have been resolved.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Standard Cards List View */
        <div className="mt-5 space-y-3">
          {filteredFindings.length > 0 ? (
            filteredFindings.map((finding) => {
              const findingId = finding.id || finding._id;
              const isPathExpanded = !!expandedAttackPaths[findingId];

              return (
                <div
                  key={findingId}
                  className="card p-5 hover:border-cg-border/60 transition-all duration-200"
                >
                  {/* Finding header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3
                                  pb-3.5 border-b border-cg-border/60">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <SeverityBadge severity={finding.severity} />
                      <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg
                                       bg-cg-primary/10 text-cg-primary border border-cg-primary/20">
                        {finding.ruleId}
                      </span>
                      <h3 className="text-sm font-bold text-cg-text">{finding.title}</h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {/* Attack Path Visualizer Button */}
                      <button
                        type="button"
                        onClick={() => toggleAttackPath(findingId)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                                   font-mono font-semibold cursor-pointer transition-all ${
                          isPathExpanded
                            ? 'bg-cg-secondary/25 text-cg-secondary border border-cg-secondary/50 shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                            : 'bg-cg-secondary/10 hover:bg-cg-secondary/20 text-cg-secondary border border-cg-secondary/25 hover:border-cg-secondary/40'
                        }`}
                        title="Trace 4-tier defensive attack path flow"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Attack Path</span>
                      </button>

                      <button
                        onClick={() => handleAutoRemediate(findingId)}
                        disabled={remediating}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                                   font-mono font-semibold cursor-pointer transition-all
                                   bg-[#34D399]/10 hover:bg-[#34D399]/20
                                   text-[#34D399] border border-[#34D399]/25 hover:border-[#34D399]/40"
                        title="Apply automated fix and re-scan"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        Quick Fix
                      </button>

                      <select
                        value={finding.status || 'OPEN'}
                        onChange={(e) => handleStatusChange(findingId, e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg bg-cg-surface border border-cg-border
                                   text-xs font-mono text-cg-muted focus:outline-none
                                   focus:border-cg-primary transition-colors cursor-pointer"
                      >
                        <option value="OPEN">OPEN</option>
                        <option value="RESOLVED">RESOLVED</option>
                        <option value="MUTED">MUTED</option>
                      </select>

                      <Link
                        to={`/findings/${findingId}`}
                        state={{ finding }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                                   font-mono font-semibold
                                   bg-cg-primary/10 hover:bg-cg-primary/20
                                   text-cg-primary border border-cg-primary/25 hover:border-cg-primary/40
                                   transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect
                      </Link>
                    </div>
                  </div>

                  {/* Finding body */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs">
                    <div>
                      <span className="section-label block mb-2">Affected Resource</span>
                      <code className="font-mono text-cg-text font-semibold
                                       bg-cg-surface px-2.5 py-1 rounded-lg border border-cg-border inline-block">
                        {finding.resource}
                      </code>
                      <p className="text-cg-muted mt-2 leading-relaxed">{finding.description}</p>
                    </div>
                    <div>
                      <span className="section-label block mb-2">Evidence</span>
                      <div className="p-3 rounded-lg font-mono text-cg-secondary/80 text-[11px]
                                      overflow-x-auto leading-relaxed border border-cg-border/60"
                           style={{ background: '#06060D' }}>
                        {finding.evidence}
                      </div>
                    </div>
                  </div>

                  {/* Inline Attack-Path Visualizer Drawer */}
                  {isPathExpanded && (
                    <div className="mt-4 pt-4 border-t border-cg-border/60 animate-slide-up">
                      <AttackPathVisualizer finding={finding} />
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-20 rounded-2xl
                            border border-dashed border-cg-border bg-cg-card/30 text-center">
              <div className="w-16 h-16 rounded-2xl bg-cg-success/10 border border-cg-success/20
                              flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-cg-success" />
              </div>
              <p className="text-base font-bold text-cg-text">Zero Security Misconfigurations Detected</p>
              <p className="text-xs text-cg-muted mt-1 font-mono">
                Infrastructure is verified compliant against all active rules.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Config Preview Modal ────────────────────────────── */}
      {previewDiff && (
        <div className="fixed inset-0 z-50 bg-cg-bg/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-4xl card p-6 shadow-[0_24px_80px_rgba(0,0,0,0.65)] space-y-4 animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-cg-border">
              <h3 className="text-sm font-bold font-mono text-cg-text flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-cg-success" />
                Remediated Hardened Configuration
              </h3>
              <button
                onClick={() => setPreviewDiff(null)}
                className="p-1.5 rounded-lg text-cg-muted hover:text-cg-text hover:bg-cg-surface transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <CodePreview code={previewDiff} title="Patched Cloud Configuration" language="json" />
            <div className="flex justify-end">
              <button
                onClick={() => setPreviewDiff(null)}
                className="btn-ghost"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Verified Remediation Report Modal ─────────────────── */}
      {activeReportModal && (
        <RemediationReportModal
          report={activeReportModal}
          onClose={() => setActiveReportModal(null)}
        />
      )}
    </div>
  );
}
