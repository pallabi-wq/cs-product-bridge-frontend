import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

export default function Reports() {
  const [r, setR] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { api.get('/api/reports/summary').then(setR).catch(e => setError(e.message)); }, []);

  if (error) return <div className="error-msg">{error}</div>;
  if (!r) return <div className="muted">Loading…</div>;

  return (
    <>
      <h1>Reports</h1>

      <div className="stats">
        <Stat label="Total" value={r.totals.total} />
        <Stat label="Open" value={r.totals.open} />
        <Stat label="Accepted" value={r.totals.accepted} />
        <Stat label="Done" value={r.totals.done} />
        <Stat label="Rejected" value={r.totals.rejected} />
        <Stat label="Acceptance rate" value={
          r.totals.acceptanceRate == null ? '—' : `${Math.round(r.totals.acceptanceRate * 100)}%`
        } />
        <Stat label="Median days → picked up" value={r.medianDaysToPickup ?? '—'} />
        <Stat label="Median days → done" value={r.medianDaysToDone ?? '—'} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        <BreakdownCard title="By customer (top 10)" rows={r.byCustomer.map(c => ({ k: c.customer_name, v: c.count }))} />
        <BreakdownCard title="By segment" rows={r.bySegment.map(s => ({ k: s.customer_segment, v: s.count }))} />
        <BreakdownCard title="By submitter (top 10)" rows={r.bySubmitter.map(s => ({ k: s.submitter, v: s.count }))} />
        <BreakdownCard title="By category" rows={r.byCategory.map(c => ({ k: c.category, v: c.count }))} />
        <BreakdownCard title="By current priority" rows={r.byPriority.map(p => ({ k: p.priority, v: p.count }))} />

        <div className="card">
          <h2>Most upvoted</h2>
          {r.mostUpvoted.length === 0 && <div className="muted">No upvoted requirements yet.</div>}
          {r.mostUpvoted.map(u => (
            <div key={u.id} style={{ padding:'6px 0', borderBottom:'1px solid var(--border)' }}>
              <Link to={`/requirements/${u.id}`}>{u.title}</Link>
              <span className="muted"> · {u.customer_name}</span>
              <strong style={{ float:'right' }}>{u.upvotes} upvote(s)</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Aging — open more than 7 days</h2>
        <p className="muted">No hard SLA enforced (per PRD), but these items have been sitting in New/Under Review for over a week.</p>
        {r.aging.length === 0 && <div className="muted">Nothing aging.</div>}
        {r.aging.length > 0 && (
          <table>
            <thead><tr><th>Title</th><th>Customer</th><th>Status</th><th>Days open</th></tr></thead>
            <tbody>
              {r.aging.map(a => (
                <tr key={a.id}>
                  <td><Link to={`/requirements/${a.id}`}>{a.title}</Link></td>
                  <td>{a.customer_name}</td>
                  <td>{a.status}</td>
                  <td>{a.days_open}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function Stat({ label, value }) {
  return <div className="stat"><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>;
}

function BreakdownCard({ title, rows }) {
  const total = rows.reduce((s, r) => s + r.v, 0);
  return (
    <div className="card">
      <h2>{title}</h2>
      {rows.length === 0 && <div className="muted">No data.</div>}
      {rows.map((row, i) => {
        const pct = total ? (row.v / total) * 100 : 0;
        return (
          <div key={i} style={{ marginBottom: 8 }}>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span>{row.k}</span><strong>{row.v}</strong>
            </div>
            <div style={{ height: 4, background: 'var(--bg)', borderRadius: 2, marginTop: 2 }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--primary)', borderRadius: 2 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
