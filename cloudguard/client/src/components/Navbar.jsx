import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Shield, LayoutDashboard, PlusCircle, History,
  Sparkles, BookOpen, LogOut, User, Menu, X, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Dashboard',    path: '/dashboard',    icon: LayoutDashboard },
    { name: 'New Scan',     path: '/scan/new',     icon: PlusCircle, highlight: true },
    { name: 'Scan History', path: '/history',      icon: History },
    { name: 'Rules',        path: '/rules',        icon: BookOpen },
    { name: 'AI Assistant', path: '/ai-assistant', icon: Sparkles, ai: true },
  ];

  const handleLogout = () => { logout(); navigate('/'); };
  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-cg-surface/90 backdrop-blur-xl border-b border-cg-border/70">
      {/* Subtle top accent line */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-cg-primary to-transparent opacity-60" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Brand ─────────────────────────────────────────── */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-cg-primary to-[#A78BFA]
                            flex items-center justify-center
                            shadow-[0_0_18px_-4px_rgba(124,92,255,0.6)]
                            group-hover:shadow-[0_0_26px_-2px_rgba(124,92,255,0.75)]
                            transition-all duration-300 group-hover:scale-105">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-base font-black tracking-widest text-cg-text font-mono">
                CLOUD<span className="text-cg-primary">GUARD</span>
              </span>
              <span className="text-[10px] text-cg-muted tracking-wide">
                Deterministic Security Scanner
              </span>
            </div>
          </Link>

          {/* ── Desktop Nav ───────────────────────────────────── */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navLinks.map((link) => {
              const Icon   = link.icon;
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`
                    flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200
                    ${active
                      ? 'bg-cg-primary/15 text-cg-primary border border-cg-primary/30'
                      : link.ai
                      ? 'text-[#A78BFA] hover:bg-[#7C5CFF]/10 hover:text-[#C4B5FD]'
                      : link.highlight
                      ? 'text-cg-secondary hover:bg-cg-secondary/10 border border-cg-secondary/20 hover:border-cg-secondary/40'
                      : 'text-cg-muted hover:text-cg-text hover:bg-cg-card'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* ── Auth Area ─────────────────────────────────────── */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3 pl-3 border-l border-cg-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cg-primary/15 border border-cg-primary/30
                                  flex items-center justify-center text-cg-primary">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-cg-text">{user?.name || 'User'}</span>
                    <span className="text-[10px] text-cg-muted">{user?.role || 'Security Engineer'}</span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-cg-muted hover:text-red-400 hover:bg-red-950/30 transition-colors"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-sm font-medium text-cg-muted
                             hover:text-cg-text hover:bg-cg-card border border-transparent
                             hover:border-cg-border transition-all duration-200"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="btn-primary"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* ── Mobile Hamburger ─────────────────────────────── */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-cg-muted hover:text-cg-text
                       hover:bg-cg-card border border-transparent hover:border-cg-border transition-all"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile Menu ──────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-cg-border bg-cg-surface/95 backdrop-blur-xl animate-slide-up">
          <nav className="px-4 pt-3 pb-4 space-y-1">
            {navLinks.map((link) => {
              const Icon   = link.icon;
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all
                    ${active
                      ? 'bg-cg-primary/15 text-cg-primary border border-cg-primary/30'
                      : 'text-cg-muted hover:text-cg-text hover:bg-cg-card'
                    }
                  `}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    {link.name}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                </Link>
              );
            })}
          </nav>

          <div className="px-4 pb-5 border-t border-cg-border/60 pt-4">
            {isAuthenticated ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cg-primary/15 border border-cg-primary/30
                                  flex items-center justify-center text-cg-primary">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-cg-text">{user?.name || 'User'}</p>
                    <p className="text-xs text-cg-muted">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400
                             border border-red-900/50 hover:bg-red-950/40 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2.5 rounded-xl bg-cg-card border border-cg-border
                             text-cg-text text-sm font-medium"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2.5 rounded-xl bg-gradient-to-r from-cg-primary to-[#A78BFA]
                             text-white text-sm font-semibold"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
