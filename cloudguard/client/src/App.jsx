import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import NewScan from './pages/NewScan';
import ScanResults from './pages/ScanResults';
import FindingDetails from './pages/FindingDetails';
import ScanHistory from './pages/ScanHistory';
import RulesInfo from './pages/RulesInfo';
import AIAssistant from './pages/AIAssistant';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-cg-bg flex flex-col text-cg-text font-sans">
          <Navbar />
          <main className="flex-1 animate-fade-in">
            <Routes>
              <Route path="/"              element={<Landing />} />
              <Route path="/login"         element={<Login />} />
              <Route path="/register"      element={<Register />} />
              <Route path="/dashboard"     element={<Dashboard />} />
              <Route path="/scan/new"      element={<NewScan />} />
              <Route path="/scan/:id"      element={<ScanResults />} />
              <Route path="/findings/:id"  element={<FindingDetails />} />
              <Route path="/history"       element={<ScanHistory />} />
              <Route path="/rules"         element={<RulesInfo />} />
              <Route path="/ai-assistant"  element={<AIAssistant />} />
              <Route path="*"             element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <footer className="py-5 border-t border-cg-border bg-cg-surface text-center">
            <p className="text-xs font-mono text-cg-muted/60 tracking-wide">
              CloudGuard &copy; {new Date().getFullYear()}
              <span className="mx-2 opacity-40">•</span>
              Deterministic Cloud Security Scanner
              <span className="mx-2 opacity-40">•</span>
              Zero Real Cloud Credentials Required
            </p>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}
