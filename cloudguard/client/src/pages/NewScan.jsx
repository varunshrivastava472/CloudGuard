import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, FileCode, Play, AlertCircle, CheckCircle2,
  RefreshCw, Zap, ShieldCheck, AlertTriangle, Info
} from 'lucide-react';
import { scanApi } from '../services/api';

const SAMPLE_VULNERABLE = `{
  "provider": "demo-cloud",
  "resources": [
    {
      "id": "storage-customer-data",
      "type": "storage",
      "name": "customer-sensitive-data",
      "publicAccess": true,
      "encryptionEnabled": false,
      "permissions": [],
      "rules": []
    },
    {
      "id": "firewall-dmz-sg",
      "type": "firewall",
      "name": "dmz-security-group",
      "rules": [
        {
          "id": "rule-ssh-public",
          "port": 22,
          "protocol": "tcp",
          "source": "0.0.0.0/0",
          "action": "allow",
          "description": "Allow public SSH access from anywhere"
        },
        {
          "id": "rule-postgres-public",
          "port": 5432,
          "protocol": "tcp",
          "source": "0.0.0.0/0",
          "action": "allow",
          "description": "Allow direct database connection from anywhere"
        }
      ]
    },
    {
      "id": "iam-admin-escalation",
      "type": "iam",
      "name": "developer-overprivileged-role",
      "permissions": ["*"]
    },
    {
      "id": "database-analytics-db",
      "type": "database",
      "name": "analytics-db",
      "publicAccess": true,
      "encryptionEnabled": false,
      "rules": [
        {
          "id": "rule-mysql-public",
          "port": 3306,
          "protocol": "tcp",
          "source": "0.0.0.0/0",
          "action": "allow"
        }
      ]
    }
  ]
}`;

const SAMPLE_SECURE = `{
  "provider": "demo-cloud",
  "resources": [
    {
      "id": "storage-vault-backup",
      "type": "storage",
      "name": "corporate-encrypted-vault",
      "publicAccess": false,
      "encryptionEnabled": true,
      "permissions": [],
      "rules": []
    },
    {
      "id": "firewall-internal-sg",
      "type": "firewall",
      "name": "internal-bastion-sg",
      "rules": [
        {
          "id": "rule-ssh-bastion",
          "port": 22,
          "protocol": "tcp",
          "source": "10.0.1.0/24",
          "action": "allow",
          "description": "Allow SSH only from internal bastion host"
        }
      ]
    },
    {
      "id": "iam-least-privilege",
      "type": "iam",
      "name": "app-backend-reader",
      "permissions": ["storage:GetObject", "storage:ListBucket", "kms:Decrypt"]
    },
    {
      "id": "database-customer-rds",
      "type": "database",
      "name": "production-orders-db",
      "publicAccess": false,
      "encryptionEnabled": true,
      "rules": [
        {
          "id": "rule-db-internal-vpc",
          "port": 5432,
          "protocol": "tcp",
          "source": "10.0.2.0/24",
          "action": "allow"
        }
      ]
    }
  ]
}`;

const SAMPLE_MIXED = `provider: demo-cloud
resources:
  - id: storage-public-assets
    type: storage
    name: public-web-assets
    publicAccess: true
    encryptionEnabled: true
    permissions: []
    rules: []

  - id: storage-audit-logs
    type: storage
    name: compliance-audit-logs
    publicAccess: false
    encryptionEnabled: false
    permissions: []
    rules: []

  - id: firewall-edge-router
    type: firewall
    name: edge-security-group
    rules:
      - id: rule-mongodb-exposed
        port: 27017
        protocol: tcp
        source: 0.0.0.0/0
        action: allow
        description: Exposed MongoDB port to public internet

  - id: iam-microservice-writer
    type: iam
    name: analytics-writer-service
    permissions:
      - storage:PutObject
      - storage:GetObject`;

const PRESETS = [
  {
    id:    'vulnerable',
    label: 'Vulnerable Sample',
    sub:   'JSON · 5+ issues',
    icon:  AlertTriangle,
    color: '#FF4D6D',
    file:  'vulnerable-infrastructure.json',
    type:  'json',
    data:  SAMPLE_VULNERABLE,
  },
  {
    id:    'secure',
    label: 'Secure Hardened',
    sub:   'JSON · 0 issues',
    icon:  ShieldCheck,
    color: '#34D399',
    file:  'secure-hardened-infrastructure.json',
    type:  'json',
    data:  SAMPLE_SECURE,
  },
  {
    id:    'mixed',
    label: 'Mixed Environment',
    sub:   'YAML · partial',
    icon:  Zap,
    color: '#FACC15',
    file:  'mixed-environment.yaml',
    type:  'yaml',
    data:  SAMPLE_MIXED,
  },
];

const SCAN_PARAMS = [
  { label: 'Detection Rules',    value: '5 Active Rules',           color: '#34D399' },
  { label: 'Execution Target',   value: 'Local Sandbox',            color: '#22D3EE' },
  { label: 'Cloud Credentials',  value: 'Zero Keys Required',       color: '#7C5CFF' },
  { label: 'Engine',             value: 'Deterministic · No AI',    color: '#8D91A6' },
];

export default function NewScan() {
  const navigate = useNavigate();

  const [fileName,      setFileName]      = useState('custom-cloud-config.json');
  const [configContent, setConfigContent] = useState(SAMPLE_VULNERABLE);
  const [fileType,      setFileType]      = useState('json');
  const [selectedFile,  setSelectedFile]  = useState(null);
  const [scanning,      setScanning]      = useState(false);
  const [error,         setError]         = useState('');
  const [activePreset,  setActivePreset]  = useState('vulnerable');

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setFileName(file.name);
    setFileType(file.name.split('.').pop().toLowerCase());
    setActivePreset(null);
    const reader = new FileReader();
    reader.onload = (ev) => setConfigContent(ev.target.result);
    reader.readAsText(file);
  };

  const loadPreset = (preset) => {
    setError('');
    setSelectedFile(null);
    setFileName(preset.file);
    setFileType(preset.type);
    setConfigContent(preset.data);
    setActivePreset(preset.id);
  };

  const handleStartScan = async () => {
    if (!configContent.trim()) {
      setError('Please provide configuration content or upload a file.');
      return;
    }
    setError('');
    setScanning(true);
    try {
      let res;
      if (selectedFile) {
        const fd = new FormData();
        fd.append('file', selectedFile);
        res = await scanApi.createScan(fd, true);
      } else {
        res = await scanApi.createScan({ fileName, fileType, content: configContent });
      }
      if (res.data?.success) {
        const scanId = res.data.data.scan.id || res.data.data.scan._id;
        navigate(`/scan/${scanId}`, { state: { scanResult: res.data.data } });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Scan failed. Please verify configuration format.');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slide-up">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="mb-7">
        <h1 className="text-2xl sm:text-3xl font-black font-mono text-cg-text flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cg-primary/15 border border-cg-primary/30
                          flex items-center justify-center">
            <FileCode className="w-5 h-5 text-cg-primary" />
          </div>
          New Security Scan
        </h1>
        <p className="text-sm text-cg-muted mt-1.5 ml-[52px]">
          Upload or paste JSON / YAML cloud templates to run the deterministic rule engine.
        </p>
      </div>

      {/* ── Preset Selector ────────────────────────────────── */}
      <div className="card p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="section-label mb-3">Quick Test Samples</p>
            <div className="flex flex-wrap gap-3">
              {PRESETS.map((preset) => {
                const Icon   = preset.icon;
                const active = activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => loadPreset(preset)}
                    className={`
                      flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium
                      border transition-all duration-200 cursor-pointer
                      ${active
                        ? 'border-current shadow-[0_0_16px_-4px_currentColor]'
                        : 'border-cg-border bg-cg-surface hover:border-cg-border/80'
                      }
                    `}
                    style={active ? { color: preset.color, borderColor: `${preset.color}50`, background: `${preset.color}12` } : {}}
                  >
                    <Icon className="w-4 h-4" style={{ color: preset.color }} />
                    <div className="text-left">
                      <p className="font-semibold text-xs" style={active ? { color: preset.color } : { color: '#F5F7FF' }}>
                        {preset.label}
                      </p>
                      <p className="text-[10px] text-cg-muted">{preset.sub}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Upload */}
          <label className="btn-ghost cursor-pointer">
            <Upload className="w-4 h-4 text-cg-secondary" />
            <span>Upload File</span>
            <input
              type="file"
              accept=".json,.yaml,.yml"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 p-4 rounded-xl bg-[#FF4D6D]/10 border border-[#FF4D6D]/30
                        text-[#FF4D6D] text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Editor + Sidebar ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Code editor */}
        <div className="lg:col-span-3 card overflow-hidden">
          {/* Editor header */}
          <div className="flex items-center justify-between px-5 py-3.5
                          border-b border-cg-border bg-cg-surface/80">
            <div className="flex items-center gap-3">
              {/* Faux traffic lights */}
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#FF4D6D]/60" />
                <span className="w-3 h-3 rounded-full bg-[#FACC15]/60" />
                <span className="w-3 h-3 rounded-full bg-[#34D399]/60" />
              </div>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="bg-transparent border-b border-dashed border-cg-border/80
                           text-cg-muted focus:border-cg-primary focus:text-cg-text
                           focus:outline-none px-1 text-xs font-mono transition-colors"
                placeholder="filename.json"
              />
            </div>
            <span className="text-[11px] font-mono text-cg-muted uppercase tracking-widest
                             px-2.5 py-0.5 rounded-lg bg-cg-border/50 border border-cg-border">
              {fileType}
            </span>
          </div>

          {/* Textarea */}
          <div className="relative" style={{ background: '#09090F' }}>
            {/* Line scan animation when scanning */}
            {scanning && <div className="absolute inset-x-0 top-0 scan-line" />}
            <textarea
              value={configContent}
              onChange={(e) => setConfigContent(e.target.value)}
              rows={22}
              spellCheck={false}
              className="w-full bg-transparent font-mono text-xs text-[#22D3EE]/90
                         leading-relaxed resize-y focus:outline-none
                         placeholder-cg-muted/40 p-5
                         selection:bg-cg-primary/30 selection:text-cg-text"
              placeholder="// Paste JSON or YAML configuration template here..."
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* Params card */}
          <div className="card p-5 space-y-4">
            <p className="section-label">Scan Parameters</p>
            {SCAN_PARAMS.map((p, i) => (
              <div key={i}>
                <span className="text-[10px] text-cg-muted/70 font-mono block mb-0.5 uppercase tracking-wider">
                  {p.label}
                </span>
                <span className="text-xs font-mono font-semibold" style={{ color: p.color }}>
                  {p.value}
                </span>
              </div>
            ))}
          </div>

          {/* Run button */}
          <button
            type="button"
            onClick={handleStartScan}
            disabled={scanning}
            className="btn-primary w-full justify-center py-4 text-base disabled:opacity-50"
          >
            {scanning ? (
              <>
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Analyzing Config...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>Run Security Scan</span>
              </>
            )}
          </button>

          {/* Info callout */}
          <div className="card p-4 border-cg-secondary/20 bg-cg-secondary/5">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-cg-secondary shrink-0 mt-0.5" />
              <p className="text-[11px] text-cg-muted leading-relaxed">
                CloudGuard uses a <span className="text-cg-text font-semibold">deterministic rule engine</span> —
                no real cloud credentials or live API calls are ever made.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
