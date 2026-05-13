import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const ROLE_META = {
  admin: { label: 'Admin',            color: '#dc2626', bg: 'rgba(239,68,68,0.08)',   desc: 'Full access — dashboard + admin panel' },
  cs:    { label: 'Customer Success', color: '#059669', bg: 'rgba(16,185,129,0.08)',  desc: 'Raise & track requirements' },
  tech:  { label: 'Tech / Product',   color: '#2563eb', bg: 'rgba(59,130,246,0.08)',  desc: 'Review, accept, reject & link Jira' },
};

export default function Login() {
  const [step, setStep]         = useState('email');   // 'email' | 'password'
  const [email, setEmail]       = useState('');
  const [rolePreview, setRolePreview] = useState(null); // { role, name } from email lookup
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState(null);
  const [busy, setBusy]         = useState(false);

  const { login } = useAuth();
  const nav = useNavigate();

  /* ── Step 1: check email ── */
  const checkEmail = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.post('/api/auth/check-email', { email });
      setRolePreview(res);   // { role, name }
      setStep('password');
    } catch (err) {
      setError(err.message || 'No account found with this email.');
    } finally {
      setBusy(false);
    }
  };

  /* ── Step 2: sign in ── */
  const signIn = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await api.post('/api/auth/login', { email, password });
      login(user);
      nav('/');
    } catch (err) {
      setError(err.message || 'Incorrect password. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const meta = rolePreview ? ROLE_META[rolePreview.role] || {} : null;

  return (
    <div className="login-page">
      <div className="login-box">

        {/* Brand */}
        <div className="login-brand">
          <div className="login-brand-icon">🌉</div>
          <h1>CS · Product Bridge</h1>
          <p>Sign in to your workspace</p>
        </div>

        {/* ── Step 1: Email ── */}
        {step === 'email' && (
          <form onSubmit={checkEmail}>
            <div className="field">
              <label>Work email</label>
              <input
                type="email"
                placeholder="you@tagmango.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(null); }}
                autoFocus
                required
              />
            </div>
            {error && <div className="error-msg">{error}</div>}
            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={busy}
              style={{ marginTop: 8 }}
            >
              {busy ? 'Checking…' : 'Continue →'}
            </button>
          </form>
        )}

        {/* ── Step 2: Role preview + Password ── */}
        {step === 'password' && (
          <form onSubmit={signIn}>

            {/* Email chip — click to go back */}
            <button
              type="button"
              className="login-email-chip"
              onClick={() => { setStep('email'); setPassword(''); setError(null); setRolePreview(null); }}
            >
              <span className="login-email-chip-icon">✉</span>
              <span className="login-email-chip-text">{email}</span>
              <span className="login-email-chip-change">Change</span>
            </button>

            {/* Role card */}
            {meta && (
              <div className="login-role-card" style={{ background: meta.bg, borderColor: meta.color + '33' }}>
                <div className="login-role-name" style={{ color: meta.color }}>
                  {rolePreview.name}
                </div>
                <div className="login-role-label" style={{ color: meta.color }}>
                  {meta.label}
                </div>
                <div className="login-role-desc">{meta.desc}</div>
              </div>
            )}

            {/* Password */}
            <div className="field" style={{ marginTop: 18 }}>
              <label>Password</label>
              <div className="pw-wrap">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null); }}
                  autoFocus
                  required
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowPw(v => !v)}
                  tabIndex={-1}
                >
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && <div className="error-msg">{error}</div>}

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={busy}
              style={{ marginTop: 8 }}
            >
              {busy ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
