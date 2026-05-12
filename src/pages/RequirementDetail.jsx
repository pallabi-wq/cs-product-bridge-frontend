import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Modal from '../components/Modal.jsx';

const PRIORITIES = ['Low','Medium','High','Critical'];
const STATUSES = ['New','Under Review','Accepted - In Backlog','Accepted - In Progress',
                  'Accepted - In Review/Testing','Done','On Hold'];

export default function RequirementDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // 'jira-create' | 'jira-link' | 'reject' | 'upvote' | null

  const load = () => api.get(`/api/requirements/${id}`).then(setData).catch(e => setError(e.message));
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [id]);

  if (error) return <div className="error-msg">{error}</div>;
  if (!data) return <div className="muted">Loading…</div>;

  const isProduct = user.role === 'product' || user.role === 'admin';
  const isOwnUpvoted = data.upvotes.some(u => u.user_id === user.id);
  const canResubmit = data.status === 'Rejected' && user.role !== 'product';

  const action = async (fn) => { try { await fn(); await load(); } catch (e) { alert(e.message); } };

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <Link to="/" className="muted">← Back to dashboard</Link>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap: 16 }}>
          <div>
            <h1 style={{ marginBottom: 4 }}>{data.title}</h1>
            <div className="muted">
              {data.customer_name} · {data.customer_segment} · {data.category} ·
              Raised by {data.submitter_name} on {data.created_at?.slice(0,10)}
            </div>
            {data.resubmitted_from_id && (
              <div className="muted" style={{ marginTop: 4 }}>
                Resubmitted from <Link to={`/requirements/${data.resubmitted_from_id}`}>previous requirement</Link>
              </div>
            )}
          </div>
          <div style={{ textAlign:'right', display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end' }}>
            <StatusBadge status={data.status} />
            <div className={`prio-${data.current_priority}`}>{data.current_priority}</div>
            {data.cs_priority !== data.current_priority &&
              <div className="muted" style={{ fontSize: 11 }}>CS set: {data.cs_priority}</div>}
            {data.jira_ticket_key && (
              <a href={data.jira_ticket_url} target="_blank" rel="noreferrer">
                {data.jira_ticket_key} ↗
              </a>
            )}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <h3>Description</h3>
          <div style={{ whiteSpace: 'pre-wrap' }}>{data.description}</div>
        </div>
        {data.business_impact && <>
          <h3>Business impact</h3>
          <div style={{ whiteSpace: 'pre-wrap' }}>{data.business_impact}</div>
        </>}
        {data.use_case && <>
          <h3>Use case</h3>
          <div style={{ whiteSpace: 'pre-wrap' }}>{data.use_case}</div>
        </>}

        {data.jira_ticket_key && (
          <>
            <h3>Jira details</h3>
            <div className="muted">
              {data.jira_assignee && <>Assignee: <span className="tag">{data.jira_assignee}</span></>}
              {data.jira_sprint && <>Sprint: <span className="tag">{data.jira_sprint}</span></>}
              {data.jira_fix_version && <>Fix version: <span className="tag">{data.jira_fix_version}</span></>}
              {!data.jira_assignee && !data.jira_sprint && !data.jira_fix_version &&
                <span>No assignee/sprint/fix version yet</span>}
            </div>
          </>
        )}

        {data.status === 'Rejected' && data.rejection_reason && (
          <>
            <h3>Rejection reason</h3>
            <div className="error-msg">{data.rejection_reason}</div>
          </>
        )}

        {/* Action buttons */}
        <div style={{ marginTop: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!isOwnUpvoted && data.status !== 'Rejected' && (
            <button className="btn" onClick={() => setModal('upvote')}>Upvote ({data.upvotes.length})</button>
          )}
          {isProduct && !data.jira_ticket_key && data.status !== 'Rejected' && (
            <>
              <button className="btn btn-primary" onClick={() => setModal('jira-create')}>Create Jira ticket</button>
              <button className="btn" onClick={() => setModal('jira-link')}>Link existing Jira</button>
            </>
          )}
          {isProduct && data.status !== 'Rejected' && data.status !== 'Done' && (
            <>
              <button className="btn btn-danger" onClick={() => setModal('reject')}>Reject</button>
              <select onChange={e => action(() => api.post(`/api/requirements/${id}/status`, { status: e.target.value }))} value="">
                <option value="">Change status…</option>
                {STATUSES.filter(s => s !== data.status).map(s => <option key={s}>{s}</option>)}
              </select>
              <select value={data.current_priority}
                onChange={e => action(() => api.post(`/api/requirements/${id}/priority`, { priority: e.target.value }))}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </>
          )}
          {canResubmit && (
            <button className="btn btn-primary" onClick={() => nav(`/raise?resubmit=${id}`)}>Resubmit with more context</button>
          )}
        </div>
      </div>

      {/* Two columns: upvotes + comments | audit log */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <h2>Upvotes ({data.upvotes.length})</h2>
          {data.upvotes.length === 0 && <div className="muted">No upvotes yet.</div>}
          {data.upvotes.map(u => (
            <div key={u.user_id} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <strong>{u.user_name}</strong> on behalf of <em>{u.customer_name}</em>
              <div className="muted" style={{ fontSize: 11 }}>{u.created_at}</div>
            </div>
          ))}

          <h2 style={{ marginTop: 24 }}>Comments</h2>
          {data.comments.length === 0 && <div className="muted">No comments yet.</div>}
          {data.comments.map(c => (
            <div key={c.id} style={{ padding: 10, background: 'var(--bg)', borderRadius: 6, marginBottom: 8 }}>
              <div className="muted" style={{ fontSize: 12 }}>
                <strong>{c.author_name}</strong> ({c.author_role}) · {c.created_at}
              </div>
              <div style={{ whiteSpace:'pre-wrap', marginTop: 4 }}>{c.body}</div>
            </div>
          ))}
          <CommentBox onSubmit={async (body) => {
            await api.post(`/api/requirements/${id}/comments`, { body });
            load();
          }} />
        </div>

        <div className="card">
          <h2>Activity log</h2>
          <div className="audit">
            {data.audit_log.map(e => <AuditEntry key={e.id} entry={e} />)}
          </div>
        </div>
      </div>

      {modal === 'upvote' && <UpvoteModal onClose={() => setModal(null)} id={id} reload={load} />}
      {modal === 'jira-create' && <JiraCreateModal onClose={() => setModal(null)} id={id} reload={load} />}
      {modal === 'jira-link' && <JiraLinkModal onClose={() => setModal(null)} id={id} reload={load} />}
      {modal === 'reject' && <RejectModal onClose={() => setModal(null)} id={id} reload={load} />}
    </>
  );
}

function CommentBox({ onSubmit }) {
  const [body, setBody] = useState('');
  return (
    <div style={{ marginTop: 12 }}>
      <textarea placeholder="Add a comment…" value={body} onChange={e => setBody(e.target.value)} />
      <div style={{ marginTop: 8 }}>
        <button className="btn btn-primary btn-sm" disabled={!body.trim()}
          onClick={async () => { await onSubmit(body); setBody(''); }}>
          Post comment
        </button>
      </div>
    </div>
  );
}

function AuditEntry({ entry }) {
  const d = entry.details || {};
  let txt;
  switch (entry.event_type) {
    case 'created': txt = `raised this requirement (priority ${d.priority}, ${d.segment})`; break;
    case 'status_change': txt = `changed status: ${d.from} → ${d.to}${d.source ? ` (${d.source})` : ''}`; break;
    case 'priority_change': txt = `changed priority: ${d.from} → ${d.to}`; break;
    case 'jira_created': txt = `created Jira ticket ${d.key}`; break;
    case 'jira_linked': txt = `linked Jira ticket ${d.key}`; break;
    case 'rejected': txt = `rejected — reason: ${d.reason}`; break;
    case 'comment_added': txt = `commented`; break;
    case 'upvoted': txt = `upvoted on behalf of ${d.customer}`; break;
    default: txt = entry.event_type;
  }
  return (
    <div className="audit-item">
      <div>
        <strong>{entry.actor_name || 'System'}</strong> {txt}
      </div>
      <div className="audit-meta">{entry.created_at}{entry.actor_role && ` · ${entry.actor_role}`}</div>
    </div>
  );
}

function UpvoteModal({ id, onClose, reload }) {
  const [customer, setCustomer] = useState('');
  const [err, setErr] = useState(null);
  const submit = async () => {
    try {
      await api.post(`/api/requirements/${id}/upvote`, { customer_name: customer });
      reload(); onClose();
    } catch (e) { setErr(e.message); }
  };
  return (
    <Modal title="Upvote on behalf of a customer" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={!customer.trim()}>Upvote</button>
      </>}>
      <p className="muted">Specify which customer/account you're voting on behalf of so we can track full demand.</p>
      <input placeholder="Customer name" value={customer} onChange={e => setCustomer(e.target.value)} autoFocus />
      {err && <div className="error-msg">{err}</div>}
    </Modal>
  );
}

function JiraCreateModal({ id, onClose, reload }) {
  const [projects, setProjects] = useState([]);
  const [projectKey, setProjectKey] = useState('');
  const [issueType, setIssueType] = useState('Task');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.get('/api/users/jira-projects').then(ps => {
      setProjects(ps);
      const def = ps.find(p => p.is_default) || ps[0];
      if (def) setProjectKey(def.key);
    });
  }, []);

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      await api.post(`/api/requirements/${id}/jira-create`, { projectKey, issueType });
      reload(); onClose();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <Modal title="Create Jira ticket" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy || !projectKey} onClick={submit}>
          {busy ? 'Creating…' : 'Create ticket'}
        </button>
      </>}>
      <p className="muted">Title and description are pre-filled from the requirement.</p>
      <div className="field">
        <label>Jira project</label>
        <select value={projectKey} onChange={e => setProjectKey(e.target.value)}>
          {projects.map(p => <option key={p.key} value={p.key}>{p.name} ({p.key})</option>)}
        </select>
      </div>
      <div className="field">
        <label>Issue type</label>
        <select value={issueType} onChange={e => setIssueType(e.target.value)}>
          <option>Task</option><option>Story</option><option>Bug</option>
        </select>
      </div>
      {err && <div className="error-msg">{err}</div>}
    </Modal>
  );
}

function JiraLinkModal({ id, onClose, reload }) {
  const [t, setT] = useState('');
  const [err, setErr] = useState(null);
  const submit = async () => {
    try {
      await api.post(`/api/requirements/${id}/jira-link`, { ticket: t });
      reload(); onClose();
    } catch (e) { setErr(e.message); }
  };
  return (
    <Modal title="Link existing Jira ticket" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={!t.trim()}>Link</button>
      </>}>
      <input placeholder="PROD-123 or full Jira URL" value={t} onChange={e => setT(e.target.value)} autoFocus />
      {err && <div className="error-msg">{err}</div>}
    </Modal>
  );
}

function RejectModal({ id, onClose, reload }) {
  const [reason, setReason] = useState('');
  const [err, setErr] = useState(null);
  const submit = async () => {
    try {
      await api.post(`/api/requirements/${id}/reject`, { reason });
      reload(); onClose();
    } catch (e) { setErr(e.message); }
  };
  return (
    <Modal title="Reject requirement" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-danger" onClick={submit} disabled={reason.trim().length < 5}>Reject</button>
      </>}>
      <p className="muted">A reason is required and will be sent to the submitter.</p>
      <textarea placeholder="Explain why this is being rejected…" value={reason}
        onChange={e => setReason(e.target.value)} autoFocus />
      {err && <div className="error-msg">{err}</div>}
    </Modal>
  );
}
