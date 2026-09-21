import React, { useState, useEffect } from 'react';
import {
  Sparkles, CheckCircle2, AlertTriangle, Shield, RefreshCw,
  ArrowRight, X, Wrench, ShieldAlert, Check, MinusCircle
} from 'lucide-react';
import SeverityBadge from './SeverityBadge';
import { scanApi } from '../services/api';

export default function WhatIfSimulator({
  scan,
  findings = [],
  onApplyFixes,
  onClose,
  isApplying = false
}) {
  const openFindings = findings.filter(f => (f.status || 'OPEN') !== 'RESOLVED');
  const [selectedFindingIds, setSelectedFindingIds] = useState(openFindings.map(f => f.id || f._id));
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [simError, setSimError] = useState('');

  // Run simulation whenever selected findings change
  useEffect(() => {
    let isCancelled = false;

    const runSimulation = async () => {
      if (!scan) return;
      setSimulating(true);
      setSimError('');

      try {
        const scanId = scan.id || scan._id;
        const res = await scanApi.simulateFixes(scanId, {
          selectedFindingIds
        });

        if (!isCancelled && res.data?.success) {
          setSimulationResult(res.data.data);
        }
      } catch (err) {
        if (!isCancelled) {
          setSimError(err.response?.data?.message || 'Simulation request failed');
        }
      } finally {
        if (!isCancelled) setSimulating(false);
      }
    };

    runSimulation();

    return () => {
      isCancelled = true;
    };
  }, [selectedFindingIds, scan]);

  const toggleFindingSelection = (id) => {
    setSelectedFindingIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedFindingIds(openFindings.map(f => f.id || f._id));
  };

  const handleSelectCriticalOnly = () => {
    setSelectedFindingIds(
      openFindings.filter(f => f.severity === 'CRITICAL').map(f => f.id || f._id)
    );
  };

  const handleClearSelection = () => {
    setSelectedFindingIds([]);
  };

  const currentScore = scan?.securityScore ?? 100;
  const predictedScore = simulationResult ? simulationResult.predictedScore : currentScore;
  const scoreDelta = Math.max(0, predictedScore - currentScore);

  const disappearedFindings = simulationResult?.findingsDisappeared || [];
  const remainingFindings = simulationResult?.findingsRemaining || openFindings.filter(
    f => !selectedFindingIds.includes(f.id || f._id)
  );

  return (
    <div className="card p-6 border-cg-secondary/40 shadow-[0_0_40px_rgba(34,211,238,0.12)] space-y-6 animate-slide-up">
      {/* Simulator Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-cg-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cg-secondary/20 to-cg-primary/30
                          border border-cg-secondary/40 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-cg-secondary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold font-mono text-cg-text">
                Security What-If Simulator
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cg-secondary/15
                               text-cg-secondary border border-cg-secondary/30 font-mono font-bold">
                Deterministic Sandbox
              </span>
            </div>
            <p className="text-xs text-cg-muted mt-0.5">
              Select remediation actions to predict security score and residual risk. Original configuration is strictly unchanged.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="btn-ghost text-xs p-2"
            title="Exit Simulator"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Simulator KPI Bar: Before vs After */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current Score */}
        <div className="p-4 rounded-xl bg-cg-surface border border-cg-border flex flex-col justify-between">
          <span className="section-label text-cg-muted">Current Security Score</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black font-mono text-cg-text">
              {currentScore}
            </span>
            <span className="text-xs font-mono text-cg-muted">/ 100</span>
          </div>
          <span className="text-[11px] font-mono text-cg-muted mt-1">
            {openFindings.length} active misconfigurations
          </span>
        </div>

        {/* Predicted Score */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-cg-surface to-cg-secondary/5
                        border border-cg-secondary/40 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="section-label text-cg-secondary">Predicted Score</span>
            {simulating && (
              <span className="w-3.5 h-3.5 border-2 border-cg-secondary/30 border-t-cg-secondary rounded-full animate-spin" />
            )}
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black font-mono text-cg-secondary">
              {predictedScore}
            </span>
            <span className="text-xs font-mono text-cg-muted">/ 100</span>
            {scoreDelta > 0 && (
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full
                               bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30 ml-2 animate-pulse">
                +{scoreDelta} pts
              </span>
            )}
          </div>
          <span className="text-[11px] font-mono text-cg-muted mt-1">
            Deterministic Engine Prediction (Zero AI Hallucinations)
          </span>
        </div>

        {/* Simulated Impact Breakdown */}
        <div className="p-4 rounded-xl bg-cg-surface border border-cg-border flex flex-col justify-between">
          <span className="section-label">Simulated Findings Delta</span>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="p-2 rounded-lg bg-[#34D399]/10 border border-[#34D399]/20 text-center">
              <span className="block text-[10px] font-mono text-[#34D399] font-bold">Disappearing</span>
              <span className="text-xl font-mono font-black text-[#34D399]">
                {disappearedFindings.length}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-[#FACC15]/10 border border-[#FACC15]/20 text-center">
              <span className="block text-[10px] font-mono text-[#FACC15] font-bold">Remaining</span>
              <span className="text-xl font-mono font-black text-[#FACC15]">
                {remainingFindings.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Selection Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-cg-surface/80 border border-cg-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-cg-muted">Batch Selection:</span>
          <button
            onClick={handleSelectAll}
            className="px-2.5 py-1 rounded-lg text-xs font-mono bg-cg-surface border border-cg-border
                       text-cg-text hover:border-cg-primary transition-colors cursor-pointer"
          >
            Select All ({openFindings.length})
          </button>
          <button
            onClick={handleSelectCriticalOnly}
            className="px-2.5 py-1 rounded-lg text-xs font-mono bg-cg-surface border border-cg-border
                       text-[#FF4D6D] hover:border-[#FF4D6D]/40 transition-colors cursor-pointer"
          >
            Critical Only
          </button>
          <button
            onClick={handleClearSelection}
            className="px-2.5 py-1 rounded-lg text-xs font-mono bg-cg-surface border border-cg-border
                       text-cg-muted hover:text-cg-text transition-colors cursor-pointer"
          >
            Clear
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onApplyFixes(selectedFindingIds)}
            disabled={selectedFindingIds.length === 0 || isApplying}
            className="btn-primary text-xs py-2 px-4 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #22D3EE 0%, #0284C7 100%)' }}
          >
            {isApplying ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Applying & Re-Scanning...</span>
              </>
            ) : (
              <>
                <Wrench className="w-3.5 h-3.5" />
                <span>Apply {selectedFindingIds.length} Selected Fixes Live</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Interactive Selection List & Preview */}
      <div className="space-y-2.5">
        <h3 className="section-label">Configured Remediation Actions ({openFindings.length})</h3>

        <div className="space-y-2">
          {openFindings.map((finding) => {
            const fId = finding.id || finding._id;
            const isSelected = selectedFindingIds.includes(fId);
            const penalty = finding.severity === 'CRITICAL' ? 20 : finding.severity === 'HIGH' ? 10 : finding.severity === 'MEDIUM' ? 5 : 2;

            return (
              <div
                key={fId}
                onClick={() => toggleFindingSelection(fId)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-[#34D399]/8 border-[#34D399]/40 shadow-[0_0_15px_rgba(52,211,153,0.1)]'
                    : 'bg-cg-surface border-cg-border hover:border-cg-border/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}} // Handled by outer div
                    className="w-4 h-4 rounded border-cg-border text-cg-primary focus:ring-cg-primary bg-cg-surface cursor-pointer"
                  />

                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <SeverityBadge severity={finding.severity} />
                      <span className="font-mono text-xs font-bold text-cg-primary">
                        {finding.ruleId}
                      </span>
                      <span className="text-xs font-bold text-cg-text">
                        {finding.title}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-cg-muted">
                      Resource: <code className="text-cg-secondary">{finding.resource}</code>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {isSelected ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#34D399]/15 border border-[#34D399]/30 text-[#34D399] text-xs font-mono font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Recovers +{penalty} pts</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cg-surface border border-cg-border text-cg-muted text-xs font-mono">
                      <MinusCircle className="w-3.5 h-3.5" />
                      <span>Remains (-{penalty} pts)</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
