import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

function nameFromEmail(email) {
  return email.split('@')[0]
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function generatePassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let pw = '';
  for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw + '@1';
}

const ROLE_LABELS = { cs: 'CS', tech: 'Tech', admin: 'Admin' };

export default function Admin() {
  const { user: me } = useAuth();
  const [users, setUsers]     = useState([]);
  const [error, setError]     = useState(null);
  const [success, setSuccess] = useState(null);
  const [newEmail, setNewEmail] = useState('');
  const [newRole,  setNewRole]  = useState('cs');
  const [adding,   setAdding]   = useState(false);

  const flash = (msg, isErr = false) => {
    if (isErr) { setError(msg);   setTimeout(() => setError(null),   4500); }
    else        { setSuccess(msg); setTimeout(() => setSuccess(null), 9000); }
  };

  const load = async () => {
    try { setUsers(await api.get('/api/users')); }
    catch (e) { flash(e.message, true); }
  };
  useEffect(() => { load(); }, []);

  const addUser = async (e) => {
    e.preventDefault();
    setAdding(true);
    const tempPw = generatePassword();
    try {
      await api.post('/api/users', { name: nameFromEmail(newEmail), email: newEmail, role: newRole, password: tempPw });
      setNewEmail(''); setNewRole('cs');
      flash(`Member added — temporary password: ${tempPw}`);
      load();
    } catch (e) { flash(e.message, true); }
    setAdding(false);
  };

  const deleteUser = async (id, name) => {
    if (!confirm(`Remove ${name} from the team?`)) return;
    try { await api.del(`/api/users/${id}`); load(); }
    catch (e) { flash(e.message, true); }
  };

  const webhookUrl = `https://xkbgloaanzirzasldwro.supabase.co/functions/v1/api/api/webhooks/jira?secret=changeme`;
  const counts = {
    cs:    users.filter(u => u.role === 'cs').length,
    tech:  users.filter(u => u.role === 'tech').length,
    admin: users.filter(u => u.role === 'admin').length,
  };

  return (
    <div className="admin-layout">

      {/* ── LEFT: Team Members ─────────────────────────────────── */}
      <div className="adm-card">

        {/* Header */}
        <div className="adm-card-hd">
          <div>
            <div className="adm-card-title">Team Members</div>
            <div className="adm-card-sub">Manage who can access this platform</div>
          </div>
          <div className="adm-role-pills">
            {counts.cs    > 0 && <span className="adm-pill adm-pill-cs">{counts.cs} CS</span>}
            {counts.tech  > 0 && <span className="adm-pill adm-pill-tech">{counts.tech} Tech</span>}
            {counts.admin > 0 && <span className="adm-pill adm-pill-admin">{counts.admin} Admin</span>}
          </div>
        </div>

        {/* Alerts */}
        {error   && <div className="adm-alert adm-alert-err">{error}</div>}
        {success && <div className="adm-alert adm-alert-ok">🔑 {success}</div>}

        {/* Member rows */}
        <div className="adm-members">
          {users.length === 0 && <div className="adm-empty">No members yet — add one below.</div>}
          {users.map(u => {
            const initials = u.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            return (
              <div key={u.id} className="adm-member-row">
                <div className={`adm-avatar adm-av-${u.role}`}>{initials}</div>
                <div className="adm-member-info">
                  <div className="adm-member-name">{u.name}</div>
                  <div className="adm-member-email">{u.email}</div>
                </div>
                <span className={`adm-role-tag adm-role-${u.role}`}>{ROLE_LABELS[u.role] || u.role}</span>
                {u.id === me.id
                  ? <span className="adm-you-tag">You</span>
                  : <button className="adm-remove" onClick={() => deleteUser(u.id, u.name)}>Remove</button>
                }
              </div>
            );
          })}
        </div>

        {/* Add member */}
        <div className="adm-add-wrap">
          <div className="adm-add-title">Add new member</div>
          <form className="adm-add-row" onSubmit={addUser}>
            <div className="adm-email-wrap">
              <span className="adm-email-ico">✉</span>
              <input
                type="email"
                className="adm-email-input"
                placeholder="name@tagmango.com"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                required
              />
            </div>
            <select className="adm-role-select" value={newRole} onChange={e => setNewRole(e.target.value)}>
              <option value="cs">CS — Customer Success</option>
              <option value="tech">Tech — Engineering</option>
              <option value="admin">Admin</option>
            </select>
            <button className="btn btn-primary" type="submit" disabled={adding}>
              {adding ? 'Adding…' : '+ Add Member'}
            </button>
          </form>
          <div className="adm-add-hint">A temporary password is auto-generated and shown above — share it with the new member.</div>
        </div>
      </div>

      {/* ── RIGHT: Jira Integration ────────────────────────────── */}
      <div className="adm-card adm-jira-card">

        <div className="adm-card-hd">
          <div>
            <div className="adm-card-title">Jira Integration</div>
            <div className="adm-card-sub">Real-time issue status sync via webhook</div>
          </div>
          <span className="adm-jira-live">⚡ Live</span>
        </div>

        {/* Visual webhook section */}
        <div className="adm-jira-body">
          <div className="adm-jira-graphic">🔗</div>
          <p className="adm-jira-desc">
            Paste this URL into Jira as a webhook. Whenever a Jira issue status changes,
            this platform updates automatically — no manual refreshing needed.
          </p>

          <div className="adm-webhook-box">
            <div className="adm-webhook-label">Webhook URL</div>
            <div className="adm-webhook-row">
              <code className="adm-webhook-url">{webhookUrl}</code>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => { navigator.clipboard.writeText(webhookUrl); flash('Copied!'); }}
              >
                Copy
              </button>
            </div>
          </div>

          <div className="adm-steps">
            <div className="adm-steps-label">How to set up</div>
            {[
              ['1', 'Open your Jira project'],
              ['2', 'Go to Project Settings → Webhooks'],
              ['3', 'Click "Create Webhook"'],
              ['4', 'Paste the URL above'],
              ['5', 'Select "Issue updated" event → Save'],
            ].map(([n, txt]) => (
              <div key={n} className="adm-step">
                <span className="adm-step-num">{n}</span>
                <span className="adm-step-txt">{txt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
