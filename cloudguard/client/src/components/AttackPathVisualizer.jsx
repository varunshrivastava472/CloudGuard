import React, { useState } from 'react';
import {
  Globe, ShieldAlert, Server, Database, FolderLock, Archive,
  KeyRound, AlertTriangle, Terminal, TableProperties, FileWarning,
  FileText, UserX, ShieldCheck, ArrowRight, ArrowDown, Zap, Eye, CheckCircle2
} from 'lucide-react';
import { deriveAttackPath } from '../utils/attackPath';

const ICON_MAP = {
  Globe,
  ShieldAlert,
  Server,
  Database,
  FolderLock,
  Archive,
  KeyRound,
  AlertTriangle,
  Terminal,
  TableProperties,
  FileWarning,
  FileText,
  UserX,
  ShieldCheck
};

export default function AttackPathVisualizer({ finding, attackPathData = null, compact = false }) {
  const [activeNodeIndex, setActiveNodeIndex] = useState(1); // Default to Step 2 (Control Gate)
  const [showDefensiveBreak, setShowDefensiveBreak] = useState(false);

  const pathModel = attackPathData || deriveAttackPath(finding);
  if (!pathModel || !pathModel.path || pathModel.path.length !== 4) {
    return null;
  }

  const nodes = pathModel.path;

  const tierGradients = [
    { border: 'border-[#FF4D6D]/40', bg: 'bg-[#FF4D6D]/5', glow: 'shadow-[0_0_15px_rgba(255,77,109,0.15)]', badge: 'text-[#FF4D6D] bg-[#FF4D6D]/10 border-[#FF4D6D]/20' },
    { border: 'border-[#FF8C42]/50', bg: 'bg-[#FF8C42]/5', glow: 'shadow-[0_0_18px_rgba(255,140,66,0.18)]', badge: 'text-[#FF8C42] bg-[#FF8C42]/10 border-[#FF8C42]/20' },
    { border: 'border-[#7C5CFF]/50', bg: 'bg-[#7C5CFF]/5', glow: 'shadow-[0_0_18px_rgba(124,92,255,0.18)]', badge: 'text-[#7C5CFF] bg-[#7C5CFF]/10 border-[#7C5CFF]/20' },
    { border: 'border-[#EF4444]/60', bg: 'bg-[#EF4444]/8', glow: 'shadow-[0_0_20px_rgba(239,68,68,0.22)]', badge: 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/20' }
  ];

  return (
    <div className="w-full rounded-2xl bg-[#0B0C15] border border-cg-border/80 p-5 sm:p-6 space-y-5 transition-all">
      {/* Visualizer Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-cg-border/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF4D6D]/20 to-[#7C5CFF]/20
                          border border-[#7C5CFF]/30 flex items-center justify-center">
            <Zap className="w-4 h-4 text-cg-secondary animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-bold font-mono text-cg-text flex items-center gap-2">
              Defensive Attack-Path Flow
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cg-secondary/10
                               text-cg-secondary border border-cg-secondary/25 font-normal">
                Config Evidence
              </span>
            </h4>
            <p className="text-[11px] font-mono text-cg-muted">
              Trace exposure path from ingress to asset blast radius based on configuration evidence
            </p>
          </div>
        </div>

        {/* Toggle Defensive Cutoff simulation */}
        <button
          type="button"
          onClick={() => setShowDefensiveBreak(!showDefensiveBreak)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
            showDefensiveBreak
              ? 'bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/40 shadow-[0_0_14px_rgba(52,211,153,0.3)]'
              : 'bg-cg-surface text-cg-muted hover:text-cg-text border border-cg-border'
          }`}
          title="Highlight where defensive fix interrupts exposure path"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          {showDefensiveBreak ? 'Defensive Shield: ACTIVE' : 'Simulate Defensive Cutoff'}
        </button>
      </div>

      {/* 4-Tier Node Graph Flow */}
      <div className="relative">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
          {nodes.map((node, index) => {
            const IconComponent = ICON_MAP[node.icon] || Server;
            const style = tierGradients[index] || tierGradients[0];
            const isSelected = activeNodeIndex === index;
            const isDefendedDownstream = showDefensiveBreak && index >= 2;

            return (
              <div key={node.tier} className="relative flex flex-col">
                {/* Node Box */}
                <div
                  onClick={() => setActiveNodeIndex(index)}
                  className={`flex-1 rounded-xl p-4 border transition-all duration-200 cursor-pointer flex flex-col justify-between ${style.bg} ${style.border} ${
                    isSelected ? `${style.glow} ring-1 ring-cg-secondary/50` : 'hover:border-cg-border/90'
                  } ${isDefendedDownstream ? 'opacity-40 grayscale-[40%]' : ''}`}
                >
                  {/* Step number and Badge */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="w-5 h-5 rounded-full bg-cg-surface border border-cg-border
                                       flex items-center justify-center font-mono text-[10px] font-bold text-cg-muted">
                        {node.tier}
                      </span>
                      <span className={`text-[9px] font-mono font-extrabold uppercase px-1.5 py-0.5 rounded border tracking-wider ${style.badge}`}>
                        {node.tierName}
                      </span>
                    </div>

                    {/* Icon and Title */}
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-cg-surface/80 border border-cg-border flex items-center justify-center shrink-0">
                        <IconComponent className="w-4 h-4 text-cg-text" />
                      </div>
                      <h5 className="text-xs font-bold font-mono text-cg-text leading-tight line-clamp-2">
                        {node.title}
                      </h5>
                    </div>

                    {/* Node Summary Description */}
                    <p className="text-[11px] text-cg-muted line-clamp-3 leading-relaxed mb-2 font-sans">
                      {node.description}
                    </p>
                  </div>

                  {/* Node Footer Tag */}
                  <div className="pt-2 border-t border-cg-border/40 mt-1">
                    <span className="text-[10px] font-mono text-cg-secondary/80 flex items-center gap-1 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-cg-secondary shrink-0" />
                      {node.badge}
                    </span>
                  </div>
                </div>

                {/* Connector Arrow for Desktop & Mobile */}
                {index < 3 && (
                  <>
                    {/* Desktop Right Arrow */}
                    <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 items-center justify-center">
                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center shadow-lg transition-all ${
                        showDefensiveBreak && index === 1
                          ? 'bg-[#34D399]/20 border-[#34D399] text-[#34D399]'
                          : 'bg-cg-surface border-cg-border text-cg-muted'
                      }`}>
                        {showDefensiveBreak && index === 1 ? (
                          <span className="text-xs font-bold font-mono">✕</span>
                        ) : (
                          <ArrowRight className="w-3.5 h-3.5 text-cg-secondary" />
                        )}
                      </div>
                    </div>

                    {/* Mobile Down Arrow */}
                    <div className="flex md:hidden justify-center my-1.5">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        showDefensiveBreak && index === 1
                          ? 'bg-[#34D399]/20 border-[#34D399] text-[#34D399]'
                          : 'bg-cg-surface border-cg-border text-cg-muted'
                      }`}>
                        {showDefensiveBreak && index === 1 ? (
                          <span className="text-[10px] font-bold">✕</span>
                        ) : (
                          <ArrowDown className="w-3 h-3 text-cg-secondary" />
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Defensive Cutoff Banner (when active) */}
      {showDefensiveBreak && (
        <div className="p-3.5 rounded-xl bg-[#34D399]/10 border border-[#34D399]/30 flex items-start gap-3 animate-slide-up">
          <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-[#34D399] font-mono block mb-0.5">
              Defensive Cutoff Intercepts Attack Path
            </span>
            <span className="text-cg-muted leading-relaxed">
              {nodes[1].defensiveCutoff || pathModel.defensiveCutoffSummary}
            </span>
          </div>
        </div>
      )}

      {/* Selected Node Deep-Dive Drawer */}
      {activeNodeIndex !== null && nodes[activeNodeIndex] && (
        <div className="p-4 rounded-xl bg-cg-surface/80 border border-cg-border text-xs space-y-2.5 animate-slide-up">
          <div className="flex items-center justify-between">
            <span className="section-label">
              Tier {nodes[activeNodeIndex].tier} Inspection: {nodes[activeNodeIndex].tierName}
            </span>
            <span className="text-[11px] font-mono text-cg-muted">
              Click any node above to inspect
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
            <div>
              <span className="text-cg-muted block mb-1 font-mono">Entity / State:</span>
              <p className="font-mono text-cg-text font-semibold bg-[#06060D] p-2 rounded-lg border border-cg-border/60">
                {nodes[activeNodeIndex].title} ({nodes[activeNodeIndex].badge})
              </p>
            </div>
            <div>
              <span className="text-cg-muted block mb-1 font-mono">Configuration Evidence:</span>
              <p className="font-mono text-cg-secondary/90 bg-[#06060D] p-2 rounded-lg border border-cg-border/60 break-words">
                {nodes[activeNodeIndex].evidence || nodes[activeNodeIndex].impactScope || pathModel.evidence}
              </p>
            </div>
          </div>

          {nodes[activeNodeIndex].defensiveCutoff && (
            <div className="pt-2 border-t border-cg-border/40 text-[11px]">
              <span className="text-cg-secondary font-mono font-bold">Defensive Remediation Point: </span>
              <span className="text-cg-muted">{nodes[activeNodeIndex].defensiveCutoff}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
