import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import StatusBadge from '../components/StatusBadge.jsx';

const STATUSES   = ['New','Under Review','Accepted - In Backlog','Accepted - In Progress','Accepted - In Review/Testing','Done','Rejected','On Hold'];
const PRIORITIES = ['Low','Medium','High','Critical'];
const SEGMENTS   = ['Enterprise','Mid-Market','SMB'];
const CATEGORIES = ['Bug','Feature','Enhancement','Integration','UX'];

export default function Dashboard() {
  const { user } = useAuth();
  const [rows, setRows]       = useState([]);
  const [filters, setFilters] = useState({});
  const [sort, setSort]       = useState({ col: 'created_at', dir: 'desc' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const load = () => {
    setLoading(true);
    const qs = new URLSearchParams({ ...filters, sort: sort.col, dir: sort.dir });
    api.get(`/api/requirements?${qs}`)
      .then(setRows)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [JSON.stringify(filters), sort.col, sort.dir]);

  const setF = (k, v) => setFilters(prev => {
    const next = { ...prev };
    if (v) next[k] = v; else delete next[k];
    return next;
  });

  const toggleSort = (col) =>
    setSort(s => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'desc' });

  const sortInd = (col) => sort.col === col ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : '';

  const canRaise = user.role === 'cs' || user.role === 'admin';

  return (
    <>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1>Requirements</h1>
          <div className="muted text-sm">{rows.length} result{rows.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm" onClick={() => api.downloadCsv(filters)}>
            ⬇ Export CSV
          </button>
          {canRaise && (
            <Link to="/raise" className="btn btn-primary btn-sm">
              ➕ Raise requirement
            </Link>
          )}
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="filters" style={{ background: 'white', padding: '12px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: 16, boxShadow: 'var(--shadow)' }}>
        <input
          type="search"
          placeholder="🔍  Search title, description, customer…"
          value={filters.q || ''}
          onChange={e => setF('q', e.target.value)}
          style={{ minWidth: 260 }}
        />
        <select value={filters.status || ''} onChange={e => setF('status', e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filters.priority || ''} onChange={e => setF('priority', e.target.value)}>
          <option value="">All priorities</option>
          {PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
        <select value={filters.segment || ''} onChange={e => setF('segment', e.target.value)}>
          <option value="">All segments</option>
          {SEGMENTS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filters.category || ''} onChange={e => setF('category', e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <input
          type="text"
          placeholder="Customer name…"
          value={filters.customer || ''}
          onChange={e => setF('customer', e.target.value)}
          style={{ minWidth: 150 }}
        />
        {Object.keys(filters).length > 0 && (
          <button className="btn btn-sm btn-ghost" onClick={() => setFilters({})}>✕ Clear</button>
        )}
      </div>

      {error && <div className="error-msg">{error}</div>}

      {/* ── Table ── */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th onClick={() => toggleSort('created_at')}>Date{sortInd('created_at')}</th>
              <th onClick={() => toggleSort('title')}>Title{sortInd('title')}</th>
              <th>Raised by</th>
              <th>Customer</th>
              <th>Segment</th>
              <th onClick={() => toggleSort('current_priority')}>Priority{sortInd('current_priority')}</th>
              <th onClick={() => toggleSort('upvotes')}>👍{sortInd('upvotes')}</th>
              <th onClick={() => toggleSort('status')}>Status{sortInd('status')}</th>
              <th>Jira</th>
              <th onClick={() => toggleSort('updated_at')}>Updated{sortInd('updated_at')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={10} className="muted" style={{ textAlign: 'center', padding: 28 }}>
                  Loading…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: 40 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                  <div className="muted">
                    {Object.keys(filters).length
                      ? 'No matches — try clearing some filters.'
                      : canRaise
                        ? 'No requirements yet. Click "Raise requirement" to add the first one.'
                        : 'No requirements yet. CS team will raise them here.'}
                  </div>
                </td>
              </tr>
            )}
            {rows.map(r => (
              <tr key={r.id}>
                <td className="muted text-sm">{r.created_at?.slice(0, 10)}</td>
                <td>
                  <Link to={`/requirements/${r.id}`} style={{ fontWeight: 600 }}>
                    {r.title}
                  </Link>
                </td>
                <td className="text-sm">{r.submitter_name}</td>
                <td className="text-sm">{r.customer_name}</td>
                <td>
                  <span className="tag" style={{ background: '#f0fdf4', color: '#166534' }}>
                    {r.customer_segment}
                  </span>
                </td>
                <td className={`prio-${r.current_priority}`}>
                  {r.current_priority}
                  {r.cs_priority !== r.current_priority && (
                    <div className="muted text-sm">CS: {r.cs_priority}</div>
                  )}
                </td>
                <td style={{ textAlign: 'center' }}>
                  {r.upvotes > 0
                    ? <span className="tag">👍 {r.upvotes}</span>
                    : <span className="muted">—</span>}
                </td>
                <td><StatusBadge status={r.status} /></td>
                <td>
                  {r.jira_ticket_key
                    ? <a href={r.jira_ticket_url} target="_blank" rel="noreferrer" className="tag">{r.jira_ticket_key} ↗</a>
                    : <span className="muted">—</span>}
                </td>
                <td className="muted text-sm">{r.updated_at?.slice(0, 16).replace('T', ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
