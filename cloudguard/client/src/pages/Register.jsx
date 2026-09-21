import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, User, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const perks = [
    'Deterministic vulnerability scanning',
    'AI-powered remediation guidance',
    'Full scan history & audit trail',
    'Zero real cloud credentials required',
  ];

  return (
    <div className="min-h-[88vh] flex items-center justify-center px-4 py-12 relative">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(124,92,255,0.10), transparent 65%)' }} />

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Perks banner */}
        <div className="mb-5 card px-5 py-4 border-cg-primary/20">
          <p className="section-label mb-3">What you get</p>
          <ul className="space-y-1.5">
            {perks.map((p, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-cg-muted">
                <CheckCircle2 className="w-3.5 h-3.5 text-cg-success shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        {/* Card */}
        <div className="card p-8 shadow-[0_8px_60px_rgba(0,0,0,0.5)]">
          {/* Brand */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cg-primary to-[#A78BFA]
                            flex items-center justify-center mx-auto mb-4
                            shadow-[0_0_24px_-4px_rgba(124,92,255,0.55)]">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-black font-mono text-cg-text">Create Account</h1>
            <p className="text-sm text-cg-muted mt-1.5">Start auditing simulated cloud configurations</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-[#FF4D6D]/10 border border-[#FF4D6D]/30
                            text-[#FF4D6D] text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="section-label block mb-2">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cg-muted">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="DevSecOps Engineer"
                  className="form-input pl-10"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="section-label block mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cg-muted">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="engineer@company.com"
                  className="form-input pl-10"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="section-label block mb-2">Password (Min 6 chars)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cg-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="form-input pl-10"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3.5 mt-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-cg-border/60 text-center">
            <p className="text-xs text-cg-muted">
              Already have an account?{' '}
              <Link to="/login" className="text-cg-primary hover:underline font-semibold">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
