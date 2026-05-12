import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState(null);
  const [busy, setBusy]         = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await api.post('/api/auth/login', { email, password });
      login(user);
      nav('/');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-brand">
          <div className="login-brand-icon">🌉</div>
          <h1>CS · Product Bridge</h1>
          <p>Sign in to your workspace</p>
        </div>

        <form onSubmit={submit}>
          <div className="field">
            <label>Email address</label>
            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="field">
            <label>Password</label>
            <div className="pw-wrap">
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
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

        <div className="login-hint">
          <strong>Demo credentials (password: <code>password</code>)</strong>
          alex.admin@example.com · sam.cs@example.com · priya.product@example.com
        </div>
      </div>
    </div>
  );
}
