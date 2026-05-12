import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import StatusBadge from '../components/StatusBadge.jsx';

const STATUSES = ['New','Under Review','Accepted - In Backlog','Accepted - In Progress',
                  'Accepted - In Review/Testing','Done','Rejected','On Hold'];
const PRIORITIES = ['Low','Medium','High','Critical'];
const SEGMENTS = ['Enterprise','Mid-Market','SMB'];
const CATEGORIES = ['Bug','Feature','Enhancement','Integration','UX'];

export default function Dashboard() {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState({ col: 'created_at', dir: 'desc' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    const qs = new URLSearchParams({ ...filters, sort: sort.col, dir: sort.dir });
    api.get(`/api/requirements?${qs}`)
      .then(setRows).catch(e => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(load, [JSON.stringify(filters), sort.col, sort.dir]);

  const setF = (k, v) => setFilters(prev => {
    const next = { ...prev };
    if (v) next[k] = v; else delete next[k];
    return next;
  });

  const toggleSort = (col) => {
    setSort(s => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'desc' });
  };

  const sortIndicator = (col) => sort.col === col ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : '';

  return (
    <>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 12 }}>
        <h1>All Requirements</h1>
        <button className="btn btn-sm" onClick={() => api.downloadCsv(filters)}>Export CSV</button>
      </div>

      <div className="filters">
        <input type="search" placeholder="Search title, description, customer..."
               value={filters.q || ''} onChange={e => setF('q', e.target.value)} />
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
        <input type="text" placeholder="Customer..." value={filters.customer || ''}
               onChange={e => setF('customer', e.target.value)} />
        <button className="btn btn-sm" onClick={() => setFilters({})}>Clear</button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <table>
        <thead>
          <tr>
            <th onClick={() => toggleSort('created_at')}>Date{sortIndicator('created_at')}</th>
            <th onClick={() => toggleSort('title')}>Title{sortIndicator('title')}</th>
            <th>Raised by</th>
            <th>Customer</th>
            <th>Segment</th>
            <th onClick={() => toggleSort('current_priority')}>Priority{sortIndicator('current_priority')}</th>
            <th onClick={() => toggleSort('upvotes')}>Upvotes{sortIndicator('upvotes')}</th>
            <th onClick={() => toggleSort('status')}>Status{sortIndicator('status')}</th>
            <th>Jira</th>
            <th onClick={() => toggleSort('updated_at')}>Last update{sortIndicator('updated_at')}</th>
          </tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={10} className="muted">Loading…</td></tr>}
          {!loading && rows.length === 0 && (
            <tr><td colSpan={10} className="muted" style={{textAlign:'center', padding: 24}}>
              No requirements yet. {filters.q || Object.keys(filters).length ? 'Try clearing filters.' : 'Click "Raise" to add the first one.'}
            </td></tr>
          )}
          {rows.map(r => (
            <tr key={r.id}>
              <td className="muted">{r.created_at?.slice(0, 10)}</td>
              <td><Link to={`/requirements/${r.id}`}>{r.title}</Link></td>
              <td>{r.submitter_name}</td>
              <td>{r.customer_name}</td>
              <td>{r.customer_segment}</td>
              <td className={`prio-${r.current_priority}`}>
                {r.current_priority}
                {r.cs_priority !== r.current_priority &&
                  <span className="muted" style={{ fontSize: 11 }}> (CS: {r.cs_priority})</span>}
              </td>
              <td>{r.upvotes}</td>
              <td><StatusBadge status={r.status} /></td>
              <td>{r.jira_ticket_key
                  ? <a href={r.jira_ticket_url} target="_blank" rel="noreferrer">{r.jira_ticket_key}</a>
                  : <span className="muted">—</span>}</td>
              <td className="muted">{r.updated_at?.slice(0, 16).replace('T',' ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
