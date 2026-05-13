import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const ROLE_META = {
  admin: { label: 'Admin',            color: '#dc2626', bg: 'rgba(239,68,68,0.08)',  desc: 'Full access — dashboard + admin panel' },
  cs:    { label: 'Customer Success', color: '#059669', bg: 'rgba(16,185,129,0.08)', desc: 'Raise & track requirements' },
  tech:  { label: 'Tech / Product',   color: '#2563eb', bg: 'rgba(59,130,246,0.08)', desc: 'Review, accept, reject & link Jira' },
};

export default function Login() {
  const [step, setStep]               = useState('email');      // 'email' | 'password' | 'set-password'
  const [email, setEmail]             = useState('');
  const [rolePreview, setRolePreview] = useState(null);         // { name, role }
  const [pendingUser, setPendingUser] = useState(null);         // full user after login
  const [password, setPassword]       = useState('');
  const [newPw, setNewPw]             = useState('');
  const [confirmPw, setConfirmPw]     = useState('');
  const [showPw, setShowPw]           = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [error, setError]             = useState(null);
  const [busy, setBusy]               = useState(false);

  const { login } = useAuth();
  const nav = useNavigate();

  const clearErr = () => setError(null);

  /* ── Step 1: verify email exists ── */
  const checkEmail = async (e) => {
    e.preventDefault(); clearErr(); setBusy(true);
    try {
      const res = await api.post('/api/auth/check-email', { email });
      setRolePreview(res);
      if (res.must_change_password) {
        // New user — no password set yet, skip straight to set-password
        setPendingUser({ id: res.id, name: res.name, role: res.role });
        setStep('set-password');
      } else {
        setStep('password');
      }
    } catch (err) {
      setError(err.message || 'No account found. Contact your admin.');
    } finally { setBusy(false); }
  };

  /* ── Step 2: sign in with current password ── */
  const signIn = async (e) => {
    e.preventDefault(); clearErr(); setBusy(true);
    try {
      const user = await api.post('/api/auth/login', { email, password });
      if (user.must_change_password) {
        // Force them to set their own password before entering
        setPendingUser(user);
        setPassword('');
        setStep('set-password');
      } else {
        login(user);
        nav('/');
      }
    } catch (err) {
      setError(err.message || 'Incorrect password.');
    } finally { setBusy(false); }
  };

  /* ── Step 3: set new password ── */
  const setOwnPassword = async (e) => {
    e.preventDefault(); clearErr();
    if (newPw.length < 6)         return setError('Password must be at least 6 characters.');
    if (newPw !== confirmPw)       return setError('Passwords do not match.');
    setBusy(true);
    try {
      await api.post('/api/auth/set-password', { userId: pendingUser.id, newPassword: newPw });
      // Log them in with updated user object
      login({ ...pendingUser, must_change_password: false });
      nav('/');
    } catch (err) {
      setError(err.message || 'Failed to set password. Try again.');
    } finally { setBusy(false); }
  };

  const meta = rolePreview ? ROLE_META[rolePreview.role] : null;

  return (
    <div className="login-page">
      <div className="login-box">

        <div className="login-brand">
          <div className="login-brand-icon">🌉</div>
          <h1>CS · Product Bridge</h1>
          <p>Sign in to your workspace</p>
        </div>

        {/* ── Step 1: Email ────────────────────────── */}
        {step === 'email' && (
          <form onSubmit={checkEmail}>
            <div className="field">
              <label>Work email</label>
              <input
                type="email"
                placeholder="you@tagmango.com"
                value={email}
                onChange={e => { setEmail(e.target.value); clearErr(); }}
                autoFocus required
              />
            </div>
            {error && <div className="error-msg">{error}</div>}
            <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={busy} style={{ marginTop: 8 }}>
              {busy ? 'Checking…' : 'Continue →'}
            </button>
          </form>
        )}

        {/* ── Step 2: Password ─────────────────────── */}
        {step === 'password' && (
          <form onSubmit={signIn}>
            {/* Email chip */}
            <button type="button" className="login-email-chip"
              onClick={() => { setStep('email'); setPassword(''); clearErr(); setRolePreview(null); }}>
              <span className="login-email-chip-icon">✉</span>
              <span className="login-email-chip-text">{email}</span>
              <span className="login-email-chip-change">Change</span>
            </button>

            {/* Role card */}
            {meta && (
              <div className="login-role-card" style={{ background: meta.bg, borderColor: meta.color + '33' }}>
                <div className="login-role-name" style={{ color: meta.color }}>{rolePreview.name}</div>
                <div className="login-role-label" style={{ color: meta.color }}>{meta.label}</div>
                <div className="login-role-desc">{meta.desc}</div>
              </div>
            )}

            <div className="field" style={{ marginTop: 18 }}>
              <label>Password</label>
              <div className="pw-wrap">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); clearErr(); }}
                  autoFocus required
                />
                <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && <div className="error-msg">{error}</div>}
            <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={busy} style={{ marginTop: 8 }}>
              {busy ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>
        )}

        {/* ── Step 3: Set own password ─────────────── */}
        {step === 'set-password' && (
          <form onSubmit={setOwnPassword}>
            {/* Welcome banner */}
            <div className="login-welcome-banner">
              <div className="login-welcome-icon">👋</div>
              <div>
                <div className="login-welcome-title">Welcome, {pendingUser?.name?.split(' ')[0]}!</div>
                <div className="login-welcome-sub">Create a password to activate your account. You'll use this every time you log in.</div>
              </div>
            </div>

            <div className="field" style={{ marginTop: 18 }}>
              <label>New password</label>
              <div className="pw-wrap">
                <input
                  type={showNew ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  value={newPw}
                  onChange={e => { setNewPw(e.target.value); clearErr(); }}
                  autoFocus required minLength={6}
                />
                <button type="button" className="pw-toggle" onClick={() => setShowNew(v => !v)} tabIndex={-1}>
                  {showNew ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="field">
              <label>Confirm password</label>
              <div className="pw-wrap">
                <input
                  type={showNew ? 'text' : 'password'}
                  placeholder="Type it again"
                  value={confirmPw}
                  onChange={e => { setConfirmPw(e.target.value); clearErr(); }}
                  required
                />
              </div>
              {/* Strength indicator */}
              {newPw.length > 0 && (
                <div className="pw-strength-bar">
                  <div className={`pw-strength-fill pw-str-${
                    newPw.length >= 10 && /[A-Z]/.test(newPw) && /[0-9]/.test(newPw) ? 'strong'
                    : newPw.length >= 6 ? 'ok' : 'weak'
                  }`} />
                </div>
              )}
            </div>

            {error && <div className="error-msg">{error}</div>}
            <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={busy} style={{ marginTop: 8 }}>
              {busy ? 'Setting password…' : 'Set password & enter →'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
