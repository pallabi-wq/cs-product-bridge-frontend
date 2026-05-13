import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function Admin() {
  const [users, setUsers]       = useState([]);
  const [projects, setProjects] = useState([]);
  const [error, setError]       = useState(null);
  const [success, setSuccess]   = useState(null);

  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'cs', password: '' });
  const [newProj, setNewProj] = useState({ key: '', name: '', is_default: false });
  const [showPw, setShowPw]   = useState(false);

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(null), 3500); };

  const load = async () => {
    setError(null);
    try {
      const [u, p] = await Promise.all([
        api.get('/api/users'),
        api.get('/api/users/jira-projects'),
      ]);
      setUsers(u);
      setProjects(p);
    } catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); }, []);

  const addUser = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/api/users', newUser);
      setNewUser({ name: '', email: '', role: 'cs', password: '' });
      flash('Team member added successfully.');
      load();
    } catch (e) { setError(e.message); }
  };

  const addProj = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/api/users/jira-projects', newProj);
      setNewProj({ key: '', name: '', is_default: false });
      flash('Jira project saved.');
      load();
    } catch (e) { setError(e.message); }
  };

  const deleteUser = async (id, name) => {
    if (!confirm(`Remove ${name} from the team?`)) return;
    try {
      await api.del(`/api/users/${id}`);
      load();
    } catch (e) { setError(e.message); }
  };

  // Webhook URL for Jira config
  const webhookUrl = `https://xkbgloaanzirzasldwro.supabase.co/functions/v1/api/api/webhooks/jira?secret=changeme`;

  return (
    <>
      {error   && <div className="error-msg">{error}</div>}
      {success && <div className="success-msg">{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, alignItems: 'start' }}>

        {/* ── Team Members ── */}
        <div className="card">
          <h2>👥 Team Members</h2>
          <p className="muted text-sm" style={{ marginBottom: 14 }}>
            Give your CS or Tech team access to the platform.
          </p>

          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td className="muted text-sm">{u.email}</td>
                  <td>
                    <span className={`role-chip role-${u.role}`} style={{ display: 'inline-block' }}>
                      {u.role === 'tech' ? 'Tech' : u.role === 'cs' ? 'CS' : 'Admin'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => deleteUser(u.id, u.name)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <hr className="divider" />
          <h3>Add team member</h3>

          <form onSubmit={addUser}>
            <div className="row">
              <div className="field">
                <label>Full name</label>
                <input
                  placeholder="Jane Doe"
                  value={newUser.name}
                  onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Work email</label>
                <input
                  type="email"
                  placeholder="jane@tagmango.com"
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="row">
              <div className="field">
                <label>Role</label>
                <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                  <option value="cs">Customer Success (CS)</option>
                  <option value="tech">Tech / Product</option>
                  <option value="admin">Admin</option>
                </select>
                <div className="hint">
                  CS → raises requirements &nbsp;·&nbsp; Tech → reviews, accepts, rejects
                </div>
              </div>
              <div className="field">
                <label>Initial password</label>
                <div className="pw-wrap">
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
                    value={newUser.password}
                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                    required
                    minLength={6}
                  />
                  <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                    {showPw ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            </div>

            <button className="btn btn-primary" type="submit">➕ Add member</button>
          </form>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* ── Jira Integration ── */}
          <div className="card">
            <h2>🔗 Jira Integration</h2>
            <p className="muted text-sm" style={{ marginBottom: 14 }}>
              Configure Jira to push real-time status updates to this platform. Jira calls this webhook whenever an issue changes.
            </p>

            <div className="field">
              <label>Webhook URL (paste into Jira)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  readOnly
                  value={webhookUrl}
                  style={{ fontFamily: 'monospace', fontSize: 11, background: '#f9fafb' }}
                  onFocus={e => e.target.select()}
                />
                <button className="btn btn-sm" onClick={() => { navigator.clipboard.writeText(webhookUrl); flash('Copied!'); }}>
                  Copy
                </button>
              </div>
              <div className="hint">
                In Jira: Project Settings → Webhooks → Create Webhook → paste this URL → select "Issue updated" events.
              </div>
            </div>

            <hr className="divider" />
            <h3>Jira Projects</h3>
            {projects.length === 0
              ? <div className="muted text-sm" style={{ marginBottom: 12 }}>No projects configured yet.</div>
              : (
                <table style={{ marginBottom: 12 }}>
                  <thead><tr><th>Key</th><th>Name</th><th>Default</th></tr></thead>
                  <tbody>
                    {projects.map(p => (
                      <tr key={p.key}>
                        <td><span className="tag">{p.key}</span></td>
                        <td>{p.name}</td>
                        <td style={{ textAlign: 'center' }}>{p.is_default ? '⭐' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            }

            <form onSubmit={addProj}>
              <div className="row">
                <div className="field">
                  <label>Project key</label>
                  <input placeholder="e.g. TM" value={newProj.key} onChange={e => setNewProj({ ...newProj, key: e.target.value.toUpperCase() })} required />
                </div>
                <div className="field">
                  <label>Project name</label>
                  <input placeholder="e.g. TagMango Platform" value={newProj.name} onChange={e => setNewProj({ ...newProj, name: e.target.value })} required />
                </div>
              </div>
              <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <input type="checkbox" id="is_default" checked={newProj.is_default} onChange={e => setNewProj({ ...newProj, is_default: e.target.checked })} style={{ width: 'auto' }} />
                <label htmlFor="is_default" style={{ margin: 0, cursor: 'pointer' }}>Set as default</label>
              </div>
              <button className="btn btn-primary" type="submit">💾 Save project</button>
            </form>
          </div>

        </div>
      </div>
    </>
  );
}
