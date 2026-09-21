import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Shield, Bot, User } from 'lucide-react';
import { aiApi } from '../services/api';
import CodePreview from '../components/CodePreview';

export default function AIAssistant() {
  const [prompt,  setPrompt]  = useState('');
  const [history, setHistory] = useState([
    {
      role: 'assistant',
      text: "Hello! I'm your CloudGuard Remediation Assistant. I help explain verified security findings and generate developer-friendly remediation templates. (Note: Security detection is always performed deterministically by CloudGuard's rule engine).",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    const userMsg = prompt.trim();
    setHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setPrompt('');
    setLoading(true);

    try {
      const res = await aiApi.remediation({ prompt: userMsg });
      if (res.data?.success) {
        setHistory(prev => [...prev, {
          role: 'assistant',
          text: res.data.data.explanation || res.data.data.response,
          code: res.data.data.fixedConfig,
        }]);
      } else {
        setHistory(prev => [...prev, {
          role: 'assistant',
          text: 'AI Assistant is running in local fallback mode. Please ensure GEMINI_API_KEY is configured in .env for live Gemini generation.',
        }]);
      }
    } catch {
      setHistory(prev => [...prev, {
        role: 'assistant',
        text: 'CloudGuard AI Assistant is operating in resilient standalone mode. Configure your GEMINI_API_KEY to enable live Gemini AI guidance.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slide-up">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="pb-6 border-b border-cg-border mb-6">
        <h1 className="text-2xl sm:text-3xl font-black font-mono text-cg-text flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center
                          bg-gradient-to-tr from-[#7C5CFF] to-[#A78BFA]
                          shadow-[0_0_20px_-4px_rgba(124,92,255,0.6)]">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          AI Remediation Assistant
        </h1>
        <p className="text-sm text-cg-muted mt-1.5 ml-[52px]">
          Ask about cloud security hardening, verified findings, or request corrected JSON/YAML configurations.
        </p>
      </div>

      {/* ── Chat Window ─────────────────────────────────────── */}
      <div className="card flex flex-col shadow-[0_8px_60px_rgba(0,0,0,0.5)]"
           style={{ height: '65vh' }}>

        {/* Messages */}
        <div className="flex-1 p-5 overflow-y-auto space-y-5">
          {history.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 animate-fade-in ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {/* AI avatar */}
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cg-primary to-[#A78BFA]
                                flex items-center justify-center shrink-0 mt-1
                                shadow-[0_0_12px_-2px_rgba(124,92,255,0.5)]">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              )}

              {/* Bubble */}
              <div className={`max-w-2xl rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-cg-primary to-[#A78BFA] text-white px-4 py-3 shadow-[0_0_20px_-6px_rgba(124,92,255,0.5)]'
                  : 'bg-cg-surface border border-cg-border text-cg-muted px-4 py-3.5'
              }`}>
                <p className="whitespace-pre-wrap">{msg.text}</p>
                {msg.code && (
                  <div className="mt-3">
                    <CodePreview code={msg.code} title="Remediated Template" language="json" />
                  </div>
                )}
              </div>

              {/* User avatar */}
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-cg-border flex items-center justify-center
                                shrink-0 mt-1">
                  <User className="w-4 h-4 text-cg-muted" />
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cg-primary to-[#A78BFA]
                              flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="bg-cg-surface border border-cg-border rounded-2xl px-4 py-3.5
                              flex items-center gap-2">
                <span className="flex gap-1">
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <span key={i} className="w-2 h-2 rounded-full bg-cg-primary/60"
                          style={{ animation: `pulse 1s ease-in-out ${delay}s infinite` }} />
                  ))}
                </span>
                <span className="text-xs font-mono text-cg-muted">Analyzing with Gemini AI...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Divider */}
        <div className="border-t border-cg-border" />

        {/* Input bar */}
        <form onSubmit={handleSend} className="p-4 bg-cg-surface/50 flex items-center gap-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask about fixing STORAGE-001 or generating hardened firewall rules..."
            className="flex-1 px-4 py-3 rounded-xl text-sm font-sans
                       bg-cg-bg border border-cg-border text-cg-text
                       placeholder-cg-muted/50
                       focus:outline-none focus:border-cg-primary focus:ring-1 focus:ring-cg-primary/30
                       transition-all"
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="btn-primary px-5 py-3 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
