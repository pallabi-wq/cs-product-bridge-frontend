import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const ROLE_LABELS = { cs: 'Customer Success', product: 'Product', admin: 'Admin' };

export default function Admin() {
  const [users, setUsers]       = useState([]);
  const [projects, setProjects] = useState([]);
  const [error, setError]       = useState(null);
  const [success, setSuccess]   = useState(null);

  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'cs', password: '' });
  const [newProj, setNewProj] = useState({ key: '', name: '', is_default: false });
  const [showPw, setShowPw]   = useState(false);

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(null), 3000); };

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
      flash('User added successfully.');
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
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      await api.del(`/api/users/${id}`);
      load();
    } catch (e) { setError(e.message); }
  };

  return (
    <>
      {error   && <div className="error-msg">{error}</div>}
      {success && <div className="success-msg">{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, alignItems: 'start' }}>

        {/* ── Users ── */}
        <div className="card">
          <h2>👥 Users</h2>

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
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => deleteUser(u.id, u.name)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <hr className="divider" />
          <h3>Add new user</h3>

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
                <label>Email</label>
                <input
                  type="email"
                  placeholder="jane@company.com"
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="row">
              <div className="field">
                <label>Role</label>
                <select
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="cs">Customer Success</option>
                  <option value="product">Product</option>
                  <option value="admin">Admin</option>
                </select>
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
            </div>

            <div style={{ marginTop: 4 }}>
              <span className="muted text-sm">
                Role controls what the user can do:&nbsp;
                <strong>CS</strong> raises requirements · <strong>Product</strong> reviews &amp; accepts/rejects · <strong>Admin</strong> can do everything
              </span>
            </div>

            <button className="btn btn-primary" type="submit" style={{ marginTop: 14 }}>
              ➕ Add user
            </button>
          </form>
        </div>

        {/* ── Jira Projects ── */}
        <div className="card">
          <h2>🔗 Jira Projects</h2>
          <p className="muted text-sm" style={{ marginBottom: 14 }}>
            Configure which Jira projects requirements can be linked to. The default project is pre-selected when creating tickets.
          </p>

          {projects.length === 0
            ? <div className="muted" style={{ marginBottom: 12 }}>No projects configured yet.</div>
            : (
              <table>
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Name</th>
                    <th>Default</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map(p => (
                    <tr key={p.key}>
                      <td><span className="tag">{p.key}</span></td>
                      <td>{p.name}</td>
                      <td style={{ textAlign: 'center', fontSize: 18 }}>
                        {p.is_default ? '⭐' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }

          <hr className="divider" />
          <h3>Add / update project</h3>

          <form onSubmit={addProj}>
            <div className="row">
              <div className="field">
                <label>Project key</label>
                <input
                  placeholder="e.g. PROD"
                  value={newProj.key}
                  onChange={e => setNewProj({ ...newProj, key: e.target.value.toUpperCase() })}
                  required
                />
              </div>
              <div className="field">
                <label>Project name</label>
                <input
                  placeholder="e.g. Product Board"
                  value={newProj.name}
                  onChange={e => setNewProj({ ...newProj, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <input
                type="checkbox"
                id="is_default"
                checked={newProj.is_default}
                onChange={e => setNewProj({ ...newProj, is_default: e.target.checked })}
                style={{ width: 'auto' }}
              />
              <label htmlFor="is_default" style={{ margin: 0, cursor: 'pointer' }}>
                Set as default project
              </label>
            </div>

            <button className="btn btn-primary" type="submit">
              💾 Save project
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
