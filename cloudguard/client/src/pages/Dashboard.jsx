import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, AlertOctagon, AlertTriangle, Info, CheckCircle2,
  PlusCircle, ArrowRight, RefreshCw, Layers, Activity, TrendingUp
} from 'lucide-react';
import { dashboardApi } from '../services/api';
import ScoreGauge from '../components/ScoreGauge';
import SeverityBadge from '../components/SeverityBadge';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

/* ── Severity metric card ──────────────────────────────────── */
function MetricCard({ label, count, icon: Icon, color, penalty }) {
  return (
    <div className="card p-5 flex flex-col justify-between group hover:-translate-y-0.5 transition-all duration-200"
         style={{ borderColor: `${color}25` }}>
      <div className="flex items-center justify-between mb-3">
        <span className="section-label">{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
             style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <div>
        <span className="text-3xl font-extrabold font-mono" style={{ color }}>
          {count}
        </span>
        <span className="block text-[11px] text-cg-muted/60 mt-0.5 font-mono">{penalty}</span>
      </div>
    </div>
  );
}

/* ── Custom Recharts tooltip ────────────────────────────────── */
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="card px-3.5 py-2.5 text-xs font-mono">
        <p className="text-cg-muted">{label}</p>
        <p className="text-cg-text font-bold mt-0.5">{payload[0].value} findings</p>
      </div>
    );
  }
  return null;
}

export default function Dashboard() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getStats();
      if (res.data?.success) setStats(res.data.data);
    } catch {
      setError('Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const chartData = stats ? [
    { name: 'Critical', count: stats.findingsSummary?.critical || 0, color: '#FF4D6D' },
    { name: 'High',     count: stats.findingsSummary?.high     || 0, color: '#FF8C42' },
    { name: 'Medium',   count: stats.findingsSummary?.medium   || 0, color: '#FACC15' },
    { name: 'Low',      count: stats.findingsSummary?.low      || 0, color: '#60A5FA' },
  ] : [];

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-cg-primary/30 border-t-cg-primary animate-spin" />
        <p className="text-sm font-mono text-cg-muted">Loading security intelligence metrics...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slide-up">

      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-cg-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-mono text-cg-text flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cg-primary/15 border border-cg-primary/30
                            flex items-center justify-center">
              <Shield className="w-5 h-5 text-cg-primary" />
            </div>
            Security Posture Dashboard
          </h1>
          <p className="text-sm text-cg-muted mt-1.5 ml-[52px]">
            Real-time deterministic cloud misconfiguration audit & threat metrics
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchStats}
            className="btn-ghost p-2.5"
            title="Refresh metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link to="/scan/new" className="btn-primary">
            <PlusCircle className="w-4 h-4" />
            <span>New Scan</span>
          </Link>
        </div>
      </div>

      {/* ── KPI Row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 mt-8">
        <div className="lg:col-span-1">
          <ScoreGauge
            score={stats?.securityScore ?? 100}
            label="CloudGuard Score"
            totalPenalty={(stats?.findingsSummary?.critical * 20 + stats?.findingsSummary?.high * 10) || 0}
          />
        </div>

        <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard label="Critical" count={stats?.findingsSummary?.critical || 0} icon={AlertOctagon}  color="#FF4D6D" penalty="-20 pts each" />
          <MetricCard label="High"     count={stats?.findingsSummary?.high     || 0} icon={AlertTriangle} color="#FF8C42" penalty="-10 pts each" />
          <MetricCard label="Medium"   count={stats?.findingsSummary?.medium   || 0} icon={AlertTriangle} color="#FACC15" penalty="-5 pts each"  />
          <MetricCard label="Low"      count={stats?.findingsSummary?.low      || 0} icon={Info}          color="#60A5FA" penalty="-2 pts each"  />
        </div>
      </div>

      {/* ── Chart & Recent Scans ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-6">
        {/* Bar Chart */}
        <div className="lg:col-span-1 card p-6">
          <h3 className="flex items-center gap-2 text-sm font-bold text-cg-text mb-5">
            <Layers className="w-4 h-4 text-cg-primary" />
            Vulnerability Breakdown
          </h3>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={28}>
                <XAxis dataKey="name" stroke="#8D91A6" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#8D91A6" fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} width={24} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(124,92,255,0.05)' }} />
                <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color}
                          style={{ filter: `drop-shadow(0 0 6px ${entry.color}60)` }} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Scans */}
        <div className="lg:col-span-2 card p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-cg-text">
              <Activity className="w-4 h-4 text-cg-secondary" />
              Recent Scans
              <span className="ml-1 px-2 py-0.5 rounded-full bg-cg-border text-cg-muted text-[11px] font-mono">
                {stats?.totalScans || 0}
              </span>
            </h3>
            <Link to="/history" className="flex items-center gap-1 text-xs text-cg-secondary hover:underline font-mono">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {stats?.recentScans && stats.recentScans.length > 0 ? (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cg-border">
                    <th className="pb-3 px-1 section-label">Config / File</th>
                    <th className="pb-3 px-1 section-label">Score</th>
                    <th className="pb-3 px-1 section-label">Findings</th>
                    <th className="pb-3 px-1 section-label">Scanned</th>
                    <th className="pb-3 px-1 section-label text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cg-border/50">
                  {stats.recentScans.map((scan) => (
                    <tr key={scan.id || scan._id}
                        className="hover:bg-cg-surface/40 transition-colors group">
                      <td className="py-3.5 px-1">
                        <p className="font-semibold text-cg-text text-sm font-mono">{scan.fileName}</p>
                        <span className="text-[10px] text-cg-muted uppercase tracking-wider">
                          {scan.fileType} • {scan.provider}
                        </span>
                      </td>
                      <td className="py-3.5 px-1">
                        <span className={`font-mono font-extrabold text-sm ${
                          scan.securityScore >= 80 ? 'text-[#34D399]' :
                          scan.securityScore >= 50 ? 'text-[#FACC15]' : 'text-[#FF4D6D]'
                        }`}>
                          {scan.securityScore}<span className="text-cg-muted text-xs font-normal">/100</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-1">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono
                                         bg-cg-border/60 text-cg-muted border border-cg-border">
                          {scan.summary?.totalFindings || 0} issues
                        </span>
                      </td>
                      <td className="py-3.5 px-1 text-xs text-cg-muted font-mono">
                        {new Date(scan.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-1 text-right">
                        <Link
                          to={`/scan/${scan.id || scan._id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg
                                     bg-cg-primary/10 hover:bg-cg-primary/20
                                     text-cg-primary text-xs font-mono font-semibold
                                     border border-cg-primary/25 hover:border-cg-primary/40
                                     transition-all duration-200"
                        >
                          Results <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-cg-primary/10 border border-cg-primary/20
                              flex items-center justify-center mb-4">
                <Shield className="w-7 h-7 text-cg-primary/60" />
              </div>
              <p className="text-sm text-cg-muted mb-4">No scans recorded yet</p>
              <Link to="/scan/new" className="btn-primary">
                <PlusCircle className="w-4 h-4" />
                Run Your First Scan
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
