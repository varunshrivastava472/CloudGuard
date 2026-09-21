import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = () => {
    setEmail('demo@cloudguard.io');
    setPassword('Password123!');
  };

  return (
    <div className="min-h-[88vh] flex items-center justify-center px-4 py-12 relative">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(124,92,255,0.10), transparent 65%)' }} />

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Card */}
        <div className="card p-8 shadow-[0_8px_60px_rgba(0,0,0,0.5)]">
          {/* Brand */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cg-primary to-[#A78BFA]
                            flex items-center justify-center mx-auto mb-4
                            shadow-[0_0_24px_-4px_rgba(124,92,255,0.55)]">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-black font-mono text-cg-text">Sign In to CloudGuard</h1>
            <p className="text-sm text-cg-muted mt-1.5">Access your security dashboard & scan history</p>
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
              <label className="section-label block mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cg-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="form-input pl-10"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3.5 mt-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer links */}
          <div className="mt-6 pt-6 border-t border-cg-border/60 space-y-3 text-center">
            <p className="text-xs text-cg-muted">
              Don't have an account?{' '}
              <Link to="/register" className="text-cg-primary hover:underline font-semibold">
                Create one now
              </Link>
            </p>
            <button
              onClick={fillDemoAccount}
              className="text-xs text-cg-muted/70 hover:text-cg-muted underline-offset-2 hover:underline transition-colors"
            >
              Use demo account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
