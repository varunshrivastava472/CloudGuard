import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { History, Search, ArrowRight, Shield, RefreshCw, FileCode, PlusCircle } from 'lucide-react';
import { scanApi } from '../services/api';

export default function ScanHistory() {
  const [scans,      setScans]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error,      setError]      = useState('');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await scanApi.getScans({ limit: 100 });
      if (res.data?.success) setScans(res.data.data || []);
    } catch {
      setError('Failed to fetch scan history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  const filteredScans = scans.filter(s => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return (
      s.fileName?.toLowerCase().includes(t) ||
      s.provider?.toLowerCase().includes(t) ||
      s.fileType?.toLowerCase().includes(t)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slide-up">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-cg-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-mono text-cg-text flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cg-secondary/15 border border-cg-secondary/30
                            flex items-center justify-center">
              <History className="w-5 h-5 text-cg-secondary" />
            </div>
            Security Scan History
          </h1>
          <p className="text-sm text-cg-muted mt-1.5 ml-[52px]">
            Browse and inspect all historical cloud configuration security audits.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchHistory}
            className="btn-ghost p-2.5"
            title="Refresh history"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link to="/scan/new" className="btn-primary">
            <PlusCircle className="w-4 h-4" />
            New Scan
          </Link>
        </div>
      </div>

      {/* ── Search ─────────────────────────────────────────── */}
      <div className="mt-6 relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cg-muted pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter by filename, provider, format..."
          className="form-input pl-10"
        />
      </div>

      {/* ── Table ──────────────────────────────────────────── */}
      <div className="mt-5 card overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
        {loading ? (
          <div className="p-16 flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-cg-primary/30 border-t-cg-primary rounded-full animate-spin" />
            <p className="text-sm text-cg-muted font-mono">Loading history records...</p>
          </div>
        ) : filteredScans.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cg-border bg-cg-surface/60">
                  <th className="py-4 px-5 section-label">Config File</th>
                  <th className="py-4 px-5 section-label">Security Score</th>
                  <th className="py-4 px-5 section-label">Severity Breakdown</th>
                  <th className="py-4 px-5 section-label">Total Issues</th>
                  <th className="py-4 px-5 section-label">Timestamp</th>
                  <th className="py-4 px-5 section-label text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cg-border/50">
                {filteredScans.map((scan) => (
                  <tr key={scan.id || scan._id} className="hover:bg-cg-surface/40 transition-colors">
                    {/* File */}
                    <td className="py-4 px-5">
                      <div className="font-mono text-sm font-bold text-cg-text flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-cg-primary shrink-0" />
                        <span className="truncate max-w-[160px]">{scan.fileName}</span>
                      </div>
                      <span className="text-[11px] font-mono text-cg-muted uppercase mt-0.5 block">
                        {scan.fileType} • {scan.provider}
                      </span>
                    </td>
                    {/* Score */}
                    <td className="py-4 px-5">
                      <span className={`font-mono text-base font-extrabold ${
                        scan.securityScore >= 80 ? 'text-[#34D399]' :
                        scan.securityScore >= 50 ? 'text-[#FACC15]' : 'text-[#FF4D6D]'
                      }`}>
                        {scan.securityScore}
                        <span className="text-cg-muted text-xs font-normal">/100</span>
                      </span>
                    </td>
                    {/* Severity badges */}
                    <td className="py-4 px-5 font-mono text-xs">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {scan.summary?.critical > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-[#FF4D6D]/12 text-[#FF4D6D] border border-[#FF4D6D]/30 text-[10px] font-bold">
                            {scan.summary.critical} CRIT
                          </span>
                        )}
                        {scan.summary?.high > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-[#FF8C42]/12 text-[#FF8C42] border border-[#FF8C42]/30 text-[10px] font-bold">
                            {scan.summary.high} HIGH
                          </span>
                        )}
                        {scan.summary?.medium > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-[#FACC15]/12 text-[#FACC15] border border-[#FACC15]/30 text-[10px] font-bold">
                            {scan.summary.medium} MED
                          </span>
                        )}
                        {scan.summary?.totalFindings === 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-[#34D399]/12 text-[#34D399] border border-[#34D399]/30 text-[10px] font-bold">
                            100% CLEAN
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Count */}
                    <td className="py-4 px-5 font-mono text-sm text-cg-text font-semibold">
                      {scan.summary?.totalFindings || 0}
                    </td>
                    {/* Date */}
                    <td className="py-4 px-5 font-mono text-xs text-cg-muted">
                      {new Date(scan.createdAt).toLocaleString()}
                    </td>
                    {/* Action */}
                    <td className="py-4 px-5 text-right">
                      <Link
                        to={`/scan/${scan.id || scan._id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                   bg-cg-primary/10 hover:bg-cg-primary/20
                                   text-cg-primary text-xs font-mono font-semibold
                                   border border-cg-primary/25 hover:border-cg-primary/40
                                   transition-all duration-200"
                      >
                        Open Report <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-cg-primary/10 border border-cg-primary/20
                            flex items-center justify-center mx-auto mb-5">
              <Shield className="w-8 h-8 text-cg-primary/50" />
            </div>
            <p className="text-cg-muted text-sm mb-5">
              {searchTerm ? 'No scans match your filter.' : 'No scan history records found.'}
            </p>
            {!searchTerm && (
              <Link to="/scan/new" className="btn-primary">
                <PlusCircle className="w-4 h-4" />
                Start First Scan
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
