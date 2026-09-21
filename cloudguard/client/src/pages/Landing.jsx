import React from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Lock, Terminal, Cpu, Database,
  ArrowRight, Sparkles, FileCode, Check,
  AlertTriangle, Activity, Zap
} from 'lucide-react';

export default function Landing() {
  const coreFeatures = [
    {
      icon: Shield,
      color: '#7C5CFF',
      title: 'Deterministic Rule Engine',
      desc: 'Zero hallucination vulnerability detection. Every misconfiguration is evaluated strictly via verified, auditable security rules.',
    },
    {
      icon: Lock,
      color: '#22D3EE',
      title: 'Storage & Encryption Audits',
      desc: 'Instantly identifies unencrypted buckets, public S3 containers, and open blob endpoints.',
    },
    {
      icon: Terminal,
      color: '#34D399',
      title: 'Exposed Network Detection',
      desc: 'Detects SSH (port 22) and database ports (3306, 5432, 27017) dangerously open to 0.0.0.0/0.',
    },
    {
      icon: Cpu,
      color: '#FACC15',
      title: 'Wildcard IAM Guardrails',
      desc: 'Flags excessive wildcard permissions (*) and enforces least-privilege cloud access policies.',
    },
    {
      icon: Sparkles,
      color: '#A78BFA',
      title: 'AI Remediation Assistant',
      desc: 'Gemini-powered developer-friendly fix explanations and corrected configuration previews.',
    },
    {
      icon: Database,
      color: '#60A5FA',
      title: 'Provider-Neutral Schema',
      desc: 'Normalized schema supports JSON and YAML cloud templates across any environment.',
    },
  ];

  const pipeline = [
    { step: '01', icon: FileCode,      label: 'Config Input',    sub: 'JSON / YAML',        color: '#7C5CFF' },
    { step: '02', icon: Cpu,           label: 'Normalizer',      sub: 'Provider-Neutral',   color: '#22D3EE' },
    { step: '03', icon: Shield,        label: 'Rule Engine',     sub: 'Deterministic',      color: '#34D399' },
    { step: '04', icon: AlertTriangle, label: 'Score & Findings',sub: 'Transparent Penalty',color: '#FACC15' },
    { step: '05', icon: Sparkles,      label: 'AI Assistant',    sub: 'Optional · Gemini',  color: '#A78BFA' },
  ];

  const stats = [
    { value: '5+',    label: 'Security Rules',   icon: Shield },
    { value: '100%',  label: 'Deterministic',    icon: Activity },
    { value: '0',     label: 'Cloud Keys Needed',icon: Lock },
    { value: '<1s',   label: 'Scan Speed',        icon: Zap },
  ];

  return (
    <div className="min-h-screen">
      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-20 pb-28">
        {/* Hero radial glow */}
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: 'radial-gradient(ellipse 75% 55% at 50% -5%, rgba(124,92,255,0.18) 0%, transparent 65%)' }} />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
             style={{
               backgroundImage: `linear-gradient(rgba(124,92,255,0.6) 1px, transparent 1px),
                                  linear-gradient(90deg, rgba(124,92,255,0.6) 1px, transparent 1px)`,
               backgroundSize: '48px 48px',
             }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full mb-8
                          bg-cg-primary/10 border border-cg-primary/30 text-cg-primary
                          text-xs font-semibold font-mono tracking-wide">
            <span className="pulse-dot" />
            Deterministic Cloud Security Detection Engine
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-cg-text font-mono leading-[1.1] max-w-4xl mx-auto">
            Intelligent Cloud Security{' '}
            <span className="gradient-text-primary">
              Misconfiguration Scanner
            </span>
          </h1>

          <p className="mt-6 text-lg text-cg-muted leading-relaxed max-w-2xl mx-auto">
            Scan JSON & YAML cloud configurations for public storage, unencrypted assets,
            exposed database ports, open SSH, and wildcard IAM policies — with zero hallucination.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/scan/new"
              className="btn-primary text-base px-7 py-3.5 shadow-[0_0_32px_-4px_rgba(124,92,255,0.55)] hover:shadow-[0_0_44px_-2px_rgba(124,92,255,0.70)]"
            >
              <span>Launch New Scan</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/dashboard"
              className="btn-ghost text-base px-7 py-3.5"
            >
              View SOC Dashboard
            </Link>
          </div>

          {/* Stat Strip */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {stats.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="card p-4 text-center">
                  <Icon className="w-5 h-5 text-cg-primary mx-auto mb-2" />
                  <p className="text-2xl font-black font-mono gradient-text-primary">{s.value}</p>
                  <p className="text-xs text-cg-muted mt-0.5">{s.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Architecture Pipeline ──────────────────────────── */}
      <section className="py-16 border-y border-cg-border bg-cg-surface/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center section-label mb-8">Deterministic Security Architecture</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {pipeline.map((p, i) => {
              const Icon = p.icon;
              return (
                <React.Fragment key={i}>
                  <div className="card p-4 text-center group hover:border-cg-border/60
                                  hover:-translate-y-0.5 transition-all duration-200">
                    <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
                         style={{ background: `${p.color}18`, border: `1px solid ${p.color}30` }}>
                      <Icon className="w-5 h-5" style={{ color: p.color }} />
                    </div>
                    <span className="text-[10px] font-mono text-cg-muted/60 block">{p.step}</span>
                    <span className="text-sm font-semibold text-cg-text block mt-0.5">{p.label}</span>
                    <span className="text-[10px] text-cg-muted">{p.sub}</span>
                  </div>
                  {i < pipeline.length - 1 && (
                    <div className="hidden md:flex items-center justify-center col-span-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Feature Grid ──────────────────────────────────── */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="section-label mb-3">Core Capabilities</p>
          <h2 className="text-3xl sm:text-4xl font-black text-cg-text tracking-tight">
            Built for Developers &{' '}
            <span className="gradient-text-secondary">SecOps Engineers</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {coreFeatures.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="card-hover p-6 group cursor-default"
                style={{ '--feat-color': feat.color }}
              >
                <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center transition-all duration-300
                                group-hover:scale-110"
                     style={{
                       background: `${feat.color}15`,
                       border:     `1px solid ${feat.color}30`,
                     }}>
                  <Icon className="w-6 h-6 transition-colors" style={{ color: feat.color }} />
                </div>
                <h3 className="text-base font-bold text-cg-text mb-2">{feat.title}</h3>
                <p className="text-sm text-cg-muted leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto rounded-3xl border border-cg-primary/20
                        bg-gradient-to-br from-cg-primary/10 via-cg-card to-cg-surface
                        p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none"
               style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(124,92,255,0.12), transparent 70%)' }} />
          <Shield className="w-12 h-12 text-cg-primary mx-auto mb-5 relative z-10" />
          <h3 className="text-3xl font-black text-cg-text relative z-10">
            Start securing your cloud today
          </h3>
          <p className="text-cg-muted mt-3 mb-8 relative z-10">
            Zero real cloud credentials required. Run deterministic scans instantly.
          </p>
          <div className="flex flex-wrap justify-center gap-4 relative z-10">
            <Link to="/scan/new" className="btn-primary text-base px-8 py-3.5">
              Run Free Scan <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/register" className="btn-ghost text-base px-8 py-3.5">
              Create Account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
