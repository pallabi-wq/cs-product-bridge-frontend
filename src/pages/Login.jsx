// Stand-in for SSO. In production, redirect to OIDC and store the resulting session.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const [users, setUsers] = useState([]);
  const { login } = useAuth();
  const nav = useNavigate();

  useEffect(() => { api.get('/api/users').then(setUsers).catch(() => setUsers([])); }, []);

  const pick = (u) => { login(u); nav('/'); };

  return (
    <div className="login-wrap">
      <div className="card login-card">
        <h1>Sign in</h1>
        <p className="muted">
          This dev login mimics SSO. Pick which seeded user you want to act as — your role
          drives what you can do (CS raises requirements, Product reviews them, Admin manages
          users). Swap this screen for Okta / Google / Microsoft when going to prod.
        </p>
        <div style={{ marginTop: 16 }}>
          {users.length === 0 && <div className="muted">No users yet — run `npm run init-db` in the backend.</div>}
          {users.map(u => (
            <button key={u.id} className="user-pick" onClick={() => pick(u)}>
              <div><strong>{u.name}</strong></div>
              <div className="muted" style={{ fontSize: 12 }}>{u.email} · role: {u.role}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
