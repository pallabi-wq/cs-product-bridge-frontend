import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState(null);

  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'cs' });
  const [newProj, setNewProj] = useState({ key: '', name: '', is_default: false });

  const load = async () => {
    setError(null);
    try {
      setUsers(await api.get('/api/users'));
      setProjects(await api.get('/api/users/jira-projects'));
    } catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); }, []);

  const addUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/users', newUser);
      setNewUser({ name:'', email:'', role:'cs' });
      load();
    } catch (e) { setError(e.message); }
  };

  const addProj = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/users/jira-projects', newProj);
      setNewProj({ key:'', name:'', is_default: false });
      load();
    } catch (e) { setError(e.message); }
  };

  const deleteUser = async (id) => {
    if (!confirm('Delete this user?')) return;
    await api.del(`/api/users/${id}`);
    load();
  };

  return (
    <>
      <h1>Admin</h1>
      {error && <div className="error-msg">{error}</div>}

      <div style={{ display:'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <h2>Users</h2>
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td className="muted">{u.email}</td>
                  <td><span className="tag">{u.role}</span></td>
                  <td><button className="btn btn-sm btn-danger" onClick={() => deleteUser(u.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <form onSubmit={addUser} style={{ marginTop: 16 }}>
            <h3>Add user</h3>
            <div className="row">
              <input placeholder="Name" value={newUser.name} onChange={e => setNewUser({...newUser, name:e.target.value})} required />
              <input placeholder="Email" type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email:e.target.value})} required />
              <select value={newUser.role} onChange={e => setNewUser({...newUser, role:e.target.value})}>
                <option value="cs">CS</option>
                <option value="product">Product</option>
                <option value="admin">Admin</option>
              </select>
              <button className="btn btn-primary" type="submit">Add</button>
            </div>
          </form>
        </div>

        <div className="card">
          <h2>Jira projects</h2>
          <p className="muted" style={{ fontSize: 12 }}>Architecture supports multiple Jira projects; route by category later if needed (out of scope V1).</p>
          <table>
            <thead><tr><th>Key</th><th>Name</th><th>Default</th></tr></thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.key}>
                  <td><span className="tag">{p.key}</span></td>
                  <td>{p.name}</td>
                  <td>{p.is_default ? '★' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <form onSubmit={addProj} style={{ marginTop: 16 }}>
            <h3>Add / update project</h3>
            <div className="row">
              <input placeholder="Key (e.g. PROD)" value={newProj.key} onChange={e => setNewProj({...newProj, key:e.target.value})} required />
              <input placeholder="Name" value={newProj.name} onChange={e => setNewProj({...newProj, name:e.target.value})} required />
              <label style={{ display:'flex', alignItems:'center', gap:6 }}>
                <input type="checkbox" checked={newProj.is_default} onChange={e => setNewProj({...newProj, is_default:e.target.checked})} style={{ width:'auto' }} />
                Default
              </label>
              <button className="btn btn-primary" type="submit">Save</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
