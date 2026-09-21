import React, { useState, useEffect } from 'react';
import { BookOpen, Shield, AlertOctagon, AlertTriangle, Terminal, Lock, Cpu, Database } from 'lucide-react';
import { ruleApi } from '../services/api';
import SeverityBadge from '../components/SeverityBadge';

const FALLBACK_RULES = [
  {
    ruleId: 'STORAGE-001', name: 'Publicly Accessible Storage',   category: 'Storage',  severity: 'CRITICAL',
    description: 'Storage resource allows unrestricted public read/write access from the internet.',
    impact: 'Data breach, unauthorized data exposure, regulatory non-compliance.',
    remediation: 'Disable public access and enforce private bucket policies with role-based IAM.',
  },
  {
    ruleId: 'STORAGE-002', name: 'Storage Encryption Disabled',    category: 'Storage',  severity: 'HIGH',
    description: 'Storage resource does not have server-side or at-rest encryption enabled.',
    impact: 'Plaintext data exposure if underlying disk or snapshots are accessed.',
    remediation: 'Enable KMS or provider-managed AES-256 encryption at rest.',
  },
  {
    ruleId: 'NETWORK-001', name: 'SSH Port Open to Internet',      category: 'Network',  severity: 'CRITICAL',
    description: 'Security group permits direct SSH (port 22) connections from 0.0.0.0/0.',
    impact: 'Brute-force password guessing, SSH exploitation, lateral server breach.',
    remediation: 'Restrict SSH exclusively to internal VPN / bastion host CIDR blocks.',
  },
  {
    ruleId: 'NETWORK-002', name: 'Database Port Open to Internet', category: 'Network',  severity: 'CRITICAL',
    description: 'Database management ports (3306, 5432, 27017) are open to 0.0.0.0/0.',
    impact: 'Direct database exfiltration, unauthorized database credential attacks.',
    remediation: 'Keep databases in private subnets with access restricted only to the application tier.',
  },
  {
    ruleId: 'IAM-001',     name: 'Wildcard IAM Permission',        category: 'IAM',      severity: 'HIGH',
    description: 'IAM role or policy grants unrestricted wildcard permissions (*).',
    impact: 'Excessive privilege escalation and lateral movement across cloud assets.',
    remediation: 'Scope IAM policies to explicit, granular actions on specific resource ARNs.',
  },
];

const CATEGORY_COLOR = {
  Storage: '#22D3EE',
  Network: '#FACC15',
  IAM:     '#A78BFA',
};

export default function RulesInfo() {
  const [rules,   setRules]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const res = await ruleApi.getRules();
        if (res.data?.success) setRules(res.data.data);
        else setRules(FALLBACK_RULES);
      } catch {
        setRules(FALLBACK_RULES);
      } finally {
        setLoading(false);
      }
    };
    fetchRules();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slide-up">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-cg-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-mono text-cg-text flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cg-secondary/15 border border-cg-secondary/30
                            flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-cg-secondary" />
            </div>
            Deterministic Rules Catalog
          </h1>
          <p className="text-sm text-cg-muted mt-1.5 ml-[52px]">
            CloudGuard evaluates cloud infrastructure using strict, auditable security guardrails.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-cg-success/10 border border-cg-success/25
                           text-cg-success text-xs font-mono font-semibold">
            {rules.length} Rules Active
          </span>
        </div>
      </div>

      {/* ── Rules List ─────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-2 border-cg-primary/30 border-t-cg-primary rounded-full animate-spin" />
          <span className="text-sm text-cg-muted font-mono">Loading security rules...</span>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {rules.map((rule) => {
            const catColor = CATEGORY_COLOR[rule.category] || '#8D91A6';
            return (
              <div
                key={rule.ruleId}
                className="card p-6 hover:-translate-y-0.5 transition-all duration-200 group"
              >
                {/* Rule Header */}
                <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-cg-border/60">
                  <SeverityBadge severity={rule.severity} />
                  <span className="font-mono text-sm font-bold px-2.5 py-0.5 rounded-lg
                                   bg-cg-primary/10 text-cg-primary border border-cg-primary/20">
                    {rule.ruleId}
                  </span>
                  <h3 className="text-base font-bold text-cg-text">{rule.name}</h3>
                  <div className="ml-auto">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border"
                          style={{ color: catColor, borderColor: `${catColor}30`, background: `${catColor}12` }}>
                      {rule.category}
                    </span>
                  </div>
                </div>

                {/* Rule Body */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5 text-sm">
                  <div>
                    <p className="section-label mb-2">Description</p>
                    <p className="text-cg-muted leading-relaxed">{rule.description}</p>
                  </div>
                  <div>
                    <p className="section-label mb-2 text-[#FF4D6D]">Threat Impact</p>
                    <p className="text-cg-muted leading-relaxed">{rule.impact}</p>
                  </div>
                  <div>
                    <p className="section-label mb-2 text-cg-success">Remediation</p>
                    <p className="text-cg-muted leading-relaxed">{rule.remediation}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
