import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import StatusBadge from '../components/StatusBadge.jsx';
import Modal from '../components/Modal.jsx';

// ─── constants ────────────────────────────────────────────
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const SEGMENTS   = ['Enterprise', 'Mid-Market', 'SMB'];
const CATEGORIES = ['Bug', 'Feature', 'Enhancement', 'Integration', 'UX'];
const OPEN_STATUSES = ['New', 'Under Review', 'Accepted - In Backlog', 'Accepted - In Progress', 'Accepted - In Review/Testing', 'On Hold'];

// ─── helpers ──────────────────────────────────────────────
const truncate = (s, n = 60) => s && s.length > n ? s.slice(0, n) + '…' : (s || '—');

// ─── main component ───────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const isCS    = user.role === 'cs';
  const isTech  = user.role === 'tech' || user.role === 'admin';

  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch]     = useState('');

  // modals
  const [raiseOpen, setRaiseOpen]   = useState(false);
  const [voteModal, setVoteModal]   = useState(null);   // requirement id
  const [rejectModal, setRejectModal] = useState(null); // requirement id
  const [jiraModal, setJiraModal]   = useState(null);   // { id, mode: 'create'|'link' }

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.get('/api/requirements?sort=created_at&dir=desc');
      setRows(data);
    } catch (e) { setError(e.message); }
    finally { if (!silent) setLoading(false); }
  };

  useEffect(() => {
    load();
    // Poll every 30 s for Jira status updates
    const id = setInterval(() => load(true), 30000);
    return () => clearInterval(id);
  }, []);

  // ── tab filter ────────────────────────────────────────
  const tabCounts = {
    all:      rows.length,
    open:     rows.filter(r => OPEN_STATUSES.includes(r.status)).length,
    rejected: rows.filter(r => r.status === 'Rejected').length,
    resolved: rows.filter(r => r.status === 'Done').length,
  };

  const filtered = rows.filter(r => {
    const matchTab =
      activeTab === 'open'     ? OPEN_STATUSES.includes(r.status) :
      activeTab === 'rejected' ? r.status === 'Rejected' :
      activeTab === 'resolved' ? r.status === 'Done' : true;
    const q = search.toLowerCase();
    const matchSearch = !q || [r.title, r.customer_name, r.submitter_name, r.use_case]
      .some(v => v?.toLowerCase().includes(q));
    return matchTab && matchSearch;
  });

  return (
    <>
      {/* ── Header bar ── */}
      <div className="dash-header">
        <div>
          <h1 style={{ marginBottom: 2 }}>Requirements</h1>
          <div className="muted text-sm">{tabCounts.open} open · {tabCounts.resolved} resolved · {tabCounts.rejected} rejected</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm" onClick={() => api.downloadCsv({})}>⬇ Export</button>
          {(isCS || user.role === 'admin') && (
            <button className="btn btn-primary" onClick={() => setRaiseOpen(true)}>
              ➕ Raise Requirement
            </button>
          )}
        </div>
      </div>

      {/* ── Status tabs ── */}
      <div className="tabs">
        {[
          { key: 'all',      label: 'All' },
          { key: 'open',     label: 'Open' },
          { key: 'resolved', label: 'Resolved' },
          { key: 'rejected', label: 'Rejected' },
        ].map(t => (
          <button
            key={t.key}
            className={`tab ${activeTab === t.key ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
            <span className={`tab-count ${activeTab === t.key ? 'tab-count-active' : ''}`}>
              {tabCounts[t.key]}
            </span>
          </button>
        ))}

        <div style={{ flex: 1 }} />

        <input
          type="search"
          placeholder="🔍 Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 220, marginBottom: 0 }}
        />
      </div>

      {error && <div className="error-msg">{error}</div>}

      {/* ── Requirements table ── */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 42 }}>No.</th>
              <th style={{ width: 140 }}>POC</th>
              <th>Title</th>
              <th style={{ width: 180 }}>Use Case</th>
              <th style={{ width: 70, textAlign: 'center' }}>Attach.</th>
              <th style={{ width: 90 }}>Priority</th>
              <th style={{ width: 200 }}>Jira / Status</th>
              <th style={{ width: 100, textAlign: 'center' }}>Vote</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32 }} className="muted">Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 48 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
                  <div className="muted">
                    {search ? 'No matches found.' :
                     activeTab !== 'all' ? `No ${activeTab} requirements.` :
                     isCS ? 'No requirements yet — click "Raise Requirement" to add one.' :
                     'No requirements yet.'}
                  </div>
                </td>
              </tr>
            )}
            {filtered.map((r, i) => (
              <RequirementRow
                key={r.id}
                idx={i + 1}
                req={r}
                user={user}
                isTech={isTech}
                onVote={() => setVoteModal(r.id)}
                onReject={() => setRejectModal(r.id)}
                onJira={(mode) => setJiraModal({ id: r.id, mode })}
                onRefresh={() => load(true)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Modals ── */}
      {raiseOpen && (
        <RaiseModal onClose={() => setRaiseOpen(false)} onSuccess={() => { setRaiseOpen(false); load(); }} />
      )}
      {voteModal && (
        <VoteModal id={voteModal} onClose={() => setVoteModal(null)} onSuccess={() => { setVoteModal(null); load(true); }} />
      )}
      {rejectModal && (
        <RejectModal id={rejectModal} onClose={() => setRejectModal(null)} onSuccess={() => { setRejectModal(null); load(true); }} />
      )}
      {jiraModal && (
        jiraModal.mode === 'create'
          ? <JiraCreateModal id={jiraModal.id} onClose={() => setJiraModal(null)} onSuccess={() => { setJiraModal(null); load(true); }} />
          : <JiraLinkModal  id={jiraModal.id} onClose={() => setJiraModal(null)} onSuccess={() => { setJiraModal(null); load(true); }} />
      )}
    </>
  );
}

// ─── Row component ────────────────────────────────────────
function RequirementRow({ idx, req: r, user, isTech, onVote, onReject, onJira, onRefresh }) {
  const isOwn     = r.submitter_id === user.id;
  const canVote   = !isOwn && !['Rejected', 'Done'].includes(r.status);
  const canAct    = isTech && !['Rejected', 'Done'].includes(r.status);
  const upvoteCount = typeof r.upvotes === 'number' ? r.upvotes : (r.upvotes?.length ?? 0);

  return (
    <tr className="req-row">
      {/* No. */}
      <td className="muted text-sm" style={{ textAlign: 'center', fontWeight: 600 }}>{idx}</td>

      {/* POC */}
      <td>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{r.submitter_name}</div>
        <div className="muted text-sm">{r.customer_name}</div>
      </td>

      {/* Title */}
      <td>
        <Link to={`/requirements/${r.id}`} style={{ fontWeight: 600, fontSize: 13 }}>
          {r.title}
        </Link>
        <div style={{ marginTop: 3 }}>
          <StatusBadge status={r.status} />
        </div>
      </td>

      {/* Use case */}
      <td className="text-sm muted">{truncate(r.use_case)}</td>

      {/* Attachment */}
      <td style={{ textAlign: 'center' }}>
        <span className="muted">—</span>
      </td>

      {/* Priority */}
      <td>
        <span className={`prio-badge prio-${r.current_priority}`}>
          {r.current_priority}
        </span>
      </td>

      {/* Jira / Status */}
      <td>
        {r.jira_ticket_key ? (
          <div>
            <a href={r.jira_ticket_url} target="_blank" rel="noreferrer" className="jira-link">
              🔗 {r.jira_ticket_key}
            </a>
            <div className="muted text-sm" style={{ marginTop: 2 }}>
              {r.jira_assignee ? `👤 ${r.jira_assignee}` : ''}
              {r.jira_sprint ? ` · 🏃 ${r.jira_sprint}` : ''}
            </div>
            {canAct && (
              <button className="btn btn-sm btn-danger" style={{ marginTop: 6 }} onClick={onReject}>
                Reject
              </button>
            )}
          </div>
        ) : (
          <div>
            {isTech ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                <button className="btn btn-sm btn-primary" onClick={() => onJira('create')}>
                  + Create Jira
                </button>
                <button className="btn btn-sm" onClick={() => onJira('link')}>
                  🔗 Link Jira
                </button>
                {canAct && (
                  <button className="btn btn-sm btn-danger" onClick={onReject}>
                    ✕ Reject
                  </button>
                )}
              </div>
            ) : (
              <span className="muted">—</span>
            )}
          </div>
        )}
      </td>

      {/* Vote */}
      <td style={{ textAlign: 'center' }}>
        {isOwn ? (
          <span className="muted text-sm">yours</span>
        ) : canVote ? (
          <button className="vote-btn" onClick={onVote}>
            👍 <span>{upvoteCount}</span>
          </button>
        ) : (
          <span className="muted text-sm">
            {upvoteCount > 0 ? `👍 ${upvoteCount}` : '—'}
          </span>
        )}
      </td>
    </tr>
  );
}

// ─── Raise Requirement Modal ──────────────────────────────
function RaiseModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    title: '', description: '', customer_name: '', customer_segment: 'Mid-Market',
    business_impact: '', category: 'Feature', use_case: '', priority: 'Medium',
  });
  const [error, setError] = useState(null);
  const [busy, setBusy]   = useState(false);
  const up = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null); setBusy(true);
    try {
      await api.post('/api/requirements', form);
      onSuccess();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Modal title="Raise a Requirement" onClose={onClose} footer={
      <>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy}>
          {busy ? 'Submitting…' : 'Submit'}
        </button>
      </>
    }>
      <form onSubmit={submit}>
        <div className="field">
          <label>Title *</label>
          <input value={form.title} onChange={e => up('title', e.target.value)} required placeholder="Short, descriptive title" />
        </div>
        <div className="field">
          <label>Description *</label>
          <textarea value={form.description} onChange={e => up('description', e.target.value)} required placeholder="What needs to be built or fixed?" />
        </div>
        <div className="row">
          <div className="field">
            <label>Customer / Account *</label>
            <input value={form.customer_name} onChange={e => up('customer_name', e.target.value)} required placeholder="Acme Corp" />
          </div>
          <div className="field">
            <label>Segment</label>
            <select value={form.customer_segment} onChange={e => up('customer_segment', e.target.value)}>
              {SEGMENTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label>Category</label>
            <select value={form.category} onChange={e => up('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Priority</label>
            <select value={form.priority} onChange={e => up('priority', e.target.value)}>
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Use case / scenario</label>
          <textarea value={form.use_case} onChange={e => up('use_case', e.target.value)} placeholder="How would the customer use this?" style={{ minHeight: 64 }} />
        </div>
        <div className="field">
          <label>Business impact</label>
          <textarea value={form.business_impact} onChange={e => up('business_impact', e.target.value)} placeholder="Revenue risk, churn risk, upsell opportunity…" style={{ minHeight: 64 }} />
        </div>
        {error && <div className="error-msg">{error}</div>}
      </form>
    </Modal>
  );
}

// ─── Vote Modal ───────────────────────────────────────────
function VoteModal({ id, onClose, onSuccess }) {
  const [customer, setCustomer] = useState('');
  const [error, setError]       = useState(null);
  const [busy, setBusy]         = useState(false);

  const submit = async () => {
    if (!customer.trim()) return;
    setBusy(true); setError(null);
    try {
      await api.post(`/api/requirements/${id}/upvote`, { customer_name: customer });
      onSuccess();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Modal title="Vote for this requirement" onClose={onClose} footer={
      <>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={!customer.trim() || busy}>
          {busy ? 'Voting…' : '👍 Vote'}
        </button>
      </>
    }>
      <p className="muted text-sm" style={{ marginBottom: 14 }}>
        Which customer are you voting on behalf of?
      </p>
      <div className="field">
        <label>Customer name</label>
        <input autoFocus placeholder="e.g. Acme Corp" value={customer} onChange={e => setCustomer(e.target.value)} />
      </div>
      {error && <div className="error-msg">{error}</div>}
    </Modal>
  );
}

// ─── Reject Modal ─────────────────────────────────────────
function RejectModal({ id, onClose, onSuccess }) {
  const [reason, setReason] = useState('');
  const [error, setError]   = useState(null);
  const [busy, setBusy]     = useState(false);

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      await api.post(`/api/requirements/${id}/reject`, { reason });
      onSuccess();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Modal title="Reject Requirement" onClose={onClose} footer={
      <>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-danger" onClick={submit} disabled={reason.trim().length < 5 || busy}>
          {busy ? 'Rejecting…' : 'Reject'}
        </button>
      </>
    }>
      <p className="muted text-sm" style={{ marginBottom: 14 }}>
        Provide a reason — the submitter will be notified.
      </p>
      <div className="field">
        <label>Reason *</label>
        <textarea autoFocus value={reason} onChange={e => setReason(e.target.value)} placeholder="Why is this being rejected?" />
      </div>
      {error && <div className="error-msg">{error}</div>}
    </Modal>
  );
}

// ─── Jira Create Modal ────────────────────────────────────
function JiraCreateModal({ id, onClose, onSuccess }) {
  const [projects, setProjects] = useState([]);
  const [projectKey, setProjectKey] = useState('');
  const [issueType, setIssueType]   = useState('Task');
  const [error, setError]  = useState(null);
  const [busy, setBusy]    = useState(false);

  useEffect(() => {
    api.get('/api/users/jira-projects').then(ps => {
      setProjects(ps);
      const def = ps.find(p => p.is_default) || ps[0];
      if (def) setProjectKey(def.key);
    });
  }, []);

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      await api.post(`/api/requirements/${id}/jira-create`, { projectKey, issueType });
      onSuccess();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Modal title="Create Jira Ticket" onClose={onClose} footer={
      <>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={!projectKey || busy}>
          {busy ? 'Creating…' : 'Create Ticket'}
        </button>
      </>
    }>
      <p className="muted text-sm" style={{ marginBottom: 14 }}>Title and description are pre-filled from the requirement.</p>
      <div className="field">
        <label>Jira Project</label>
        <select value={projectKey} onChange={e => setProjectKey(e.target.value)}>
          {projects.length === 0 && <option value="">No projects — configure in Admin</option>}
          {projects.map(p => <option key={p.key} value={p.key}>{p.name} ({p.key})</option>)}
        </select>
      </div>
      <div className="field">
        <label>Issue type</label>
        <select value={issueType} onChange={e => setIssueType(e.target.value)}>
          <option>Task</option><option>Story</option><option>Bug</option>
        </select>
      </div>
      {error && <div className="error-msg">{error}</div>}
    </Modal>
  );
}

// ─── Jira Link Modal ──────────────────────────────────────
function JiraLinkModal({ id, onClose, onSuccess }) {
  const [ticket, setTicket] = useState('');
  const [error, setError]   = useState(null);
  const [busy, setBusy]     = useState(false);

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      await api.post(`/api/requirements/${id}/jira-link`, { ticket });
      onSuccess();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Modal title="Link Existing Jira Ticket" onClose={onClose} footer={
      <>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={!ticket.trim() || busy}>
          {busy ? 'Linking…' : 'Link'}
        </button>
      </>
    }>
      <div className="field">
        <label>Ticket key or URL</label>
        <input autoFocus placeholder="TM-123 or https://yourorg.atlassian.net/browse/TM-123" value={ticket} onChange={e => setTicket(e.target.value)} />
      </div>
      {error && <div className="error-msg">{error}</div>}
    </Modal>
  );
}
