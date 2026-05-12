import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

export default function Reports() {
  const [r, setR]         = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/api/reports/summary').then(setR).catch(e => setError(e.message));
  }, []);

  if (error) return <div className="error-msg">{error}</div>;
  if (!r)    return <div className="muted">Loading…</div>;

  return (
    <>
      {/* ── KPI row ── */}
      <div className="stats">
        <Stat label="Total"         value={r.totals.total    ?? 0} />
        <Stat label="Open"          value={r.totals.open     ?? 0} accent />
        <Stat label="Accepted"      value={r.totals.accepted ?? 0} />
        <Stat label="Done"          value={r.totals.done     ?? 0} color="var(--success)" />
        <Stat label="Rejected"      value={r.totals.rejected ?? 0} color="var(--danger)" />
        <Stat
          label="Acceptance rate"
          value={r.totals.acceptanceRate == null ? '—' : `${Math.round(r.totals.acceptanceRate * 100)}%`}
        />
        <Stat label="Median days → pickup" value={r.medianDaysToPickup ?? '—'} />
        <Stat label="Median days → done"   value={r.medianDaysToDone   ?? '—'} />
      </div>

      {/* ── Breakdowns ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 16 }}>
        <BreakdownCard title="By customer (top 10)"   rows={r.byCustomer.map(c => ({ k: c.customer_name,  v: c.count }))} />
        <BreakdownCard title="By segment"             rows={r.bySegment.map(s  => ({ k: s.customer_segment, v: s.count }))} />
        <BreakdownCard title="By submitter (top 10)"  rows={r.bySubmitter.map(s => ({ k: s.submitter,      v: s.count }))} />
        <BreakdownCard title="By category"            rows={r.byCategory.map(c  => ({ k: c.category,       v: c.count }))} />
        <BreakdownCard title="By priority"            rows={r.byPriority.map(p  => ({ k: p.priority,       v: p.count }))} />

        <div className="card">
          <h2>🏆 Most upvoted</h2>
          {r.mostUpvoted.length === 0 && <div className="muted">No upvoted requirements yet.</div>}
          {r.mostUpvoted.map(u => (
            <div key={u.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Link to={`/requirements/${u.id}`} style={{ fontWeight: 600 }}>{u.title}</Link>
                <div className="muted text-sm">{u.customer_name}</div>
              </div>
              <span className="tag">👍 {u.upvotes}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Aging ── */}
      <div className="card">
        <h2>⏳ Aging — open more than 7 days</h2>
        <p className="muted text-sm" style={{ marginBottom: 12 }}>
          Requirements still in New / Under Review for over a week.
        </p>
        {r.aging.length === 0
          ? <div className="muted">Nothing aging — great job! 🎉</div>
          : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Days open</th>
                  </tr>
                </thead>
                <tbody>
                  {r.aging.map(a => (
                    <tr key={a.id}>
                      <td><Link to={`/requirements/${a.id}`}>{a.title}</Link></td>
                      <td>{a.customer_name}</td>
                      <td>{a.status}</td>
                      <td style={{ fontWeight: 700, color: 'var(--warning)' }}>{a.days_open}d</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </>
  );
}

function Stat({ label, value, accent, color }) {
  return (
    <div className="stat">
      <div className="stat-value" style={{ color: color || (accent ? 'var(--primary)' : 'var(--text)') }}>
        {value}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function BreakdownCard({ title, rows }) {
  const total = rows.reduce((s, r) => s + r.v, 0);
  return (
    <div className="card">
      <h2>{title}</h2>
      {rows.length === 0 && <div className="muted">No data yet.</div>}
      {rows.map((row, i) => {
        const pct = total ? (row.v / total) * 100 : 0;
        return (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 13 }}>{row.k}</span>
              <strong style={{ fontSize: 13 }}>{row.v}</strong>
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
