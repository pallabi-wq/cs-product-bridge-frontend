import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import StatusBadge from '../components/StatusBadge.jsx';
import Modal from '../components/Modal.jsx';

// ─── constants ────────────────────────────────────────────
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const SEGMENTS   = ['Enterprise', 'Mid-Market', 'SMB'];
const CATEGORIES = ['Bug', 'Feature', 'Enhancement', 'Integration', 'UX'];
const OPEN_STATUSES = ['New', 'Under Review', 'Accepted - In Backlog', 'Accepted - In Progress', 'Accepted - In Review/Testing', 'On Hold'];

const truncate = (s, n = 70) => s && s.length > n ? s.slice(0, n) + '…' : (s || '—');

const STAT_CARDS = [
  { key: 'all',      label: 'Total',    emoji: '📋', color: '#6366f1', bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.35)'  },
  { key: 'open',     label: 'Open',     emoji: '🔵', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.35)'  },
  { key: 'resolved', label: 'Resolved', emoji: '✅', color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.35)'  },
  { key: 'rejected', label: 'Rejected', emoji: '🚫', color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.35)'   },
];

// ─── main component ───────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const isCS   = user.role === 'cs' || user.role === 'admin';
  const isTech = user.role === 'tech' || user.role === 'admin';

  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch]   = useState('');
  const [detailId, setDetailId] = useState(null);

  const [raiseOpen, setRaiseOpen]     = useState(false);
  const [rejectModal, setRejectModal] = useState(null);
  const [jiraModal, setJiraModal]     = useState(null);

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
    const t = setInterval(() => load(true), 30000);
    return () => clearInterval(t);
  }, []);

  const tabCounts = {
    all:      rows.length,
    open:     rows.filter(r => OPEN_STATUSES.includes(r.status)).length,
    resolved: rows.filter(r => r.status === 'Done').length,
    rejected: rows.filter(r => r.status === 'Rejected').length,
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

  // Optimistic vote handler
  const handleVote = async (reqId, customerName) => {
    setRows(prev => prev.map(r =>
      r.id === reqId
        ? { ...r, upvotes: (typeof r.upvotes === 'number' ? r.upvotes : (r.upvotes?.length ?? 0)) + 1 }
        : r
    ));
    try {
      await api.post(`/api/requirements/${reqId}/upvote`, { customer_name: customerName });
      load(true);
    } catch (e) {
      setRows(prev => prev.map(r =>
        r.id === reqId
          ? { ...r, upvotes: Math.max(0, (typeof r.upvotes === 'number' ? r.upvotes : (r.upvotes?.length ?? 0)) - 1) }
          : r
      ));
      alert(e.message);
    }
  };

  return (
    <>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="dash-header">
        <div>
          <h1 style={{ marginBottom: 2 }}>Requirements</h1>
          <div className="muted text-sm">Track, vote and prioritise what gets built</div>
        </div>
        <div className="dash-header-right">
          <div className="req-search-wrap">
            <svg className="req-search-ico" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="8.5" cy="8.5" r="5.5"/><path d="M15 15l-3-3"/>
            </svg>
            <input
              className="req-search-input"
              type="text"
              placeholder="Search requirements…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="req-search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>
          <button className="btn btn-sm" onClick={() => api.downloadCsv({})}>⬇ Export</button>
          {isCS && (
            <button className="btn btn-primary" onClick={() => setRaiseOpen(true)}>
              ✦ Raise Requirement
            </button>
          )}
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────── */}
      <div className="stat-cards">
        {STAT_CARDS.map(c => {
          const active = activeTab === c.key;
          return (
            <button
              key={c.key}
              className={`stat-card${active ? ' stat-card-active' : ''}`}
              style={active ? { borderColor: c.border, background: c.bg } : {}}
              onClick={() => setActiveTab(c.key)}
            >
              <div className="stat-card-emoji">{c.emoji}</div>
              <div className="stat-card-count" style={active ? { color: c.color } : {}}>{tabCounts[c.key]}</div>
              <div className="stat-card-label" style={active ? { color: c.color } : {}}>{c.label}</div>
              {active && <div className="stat-card-bar" style={{ background: c.color }} />}
            </button>
          );
        })}
      </div>

      {error && <div className="error-msg">{error}</div>}

      {/* ── Table ──────────────────────────────────────────── */}
      <div className="table-wrap">
        <table className="req-table">
          <thead>
            <tr>
              <th style={{ width: 48 }}>No.</th>
              <th style={{ width: 150 }}>POC</th>
              <th>Title</th>
              <th style={{ width: 210 }}>Use Case</th>
              <th style={{ width: 95 }}>Priority</th>
              <th style={{ width: 185 }}>Jira</th>
              <th style={{ width: 130, textAlign: 'center' }}>Vote</th>
              <th style={{ width: 52 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="table-empty">
                  <div className="table-loading">
                    <div className="req-spinner" />
                    Loading requirements…
                  </div>
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="table-empty">
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
                  <div className="muted" style={{ fontSize: 14 }}>
                    {search ? `No results for "${search}"` :
                     activeTab !== 'all' ? `No ${activeTab} requirements yet` :
                     isCS ? 'No requirements yet — click Raise Requirement to add one.' :
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
                onVote={handleVote}
                onReject={() => setRejectModal(r.id)}
                onJira={(mode) => setJiraModal({ id: r.id, mode })}
                onView={() => setDetailId(r.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Detail slide-over ───────────────────────────────── */}
      {detailId && (
        <DetailPanel
          id={detailId}
          user={user}
          isTech={isTech}
          onClose={() => setDetailId(null)}
          onRefresh={() => load(true)}
        />
      )}

      {/* ── Modals ─────────────────────────────────────────── */}
      {raiseOpen && (
        <RaiseModal onClose={() => setRaiseOpen(false)} onSuccess={() => { setRaiseOpen(false); load(); }} />
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

// ─── Row ─────────────────────────────────────────────────
function RequirementRow({ idx, req: r, user, isTech, onVote, onReject, onJira, onView }) {
  const isOwn  = r.submitter_id === user.id;
  const canVote = !isOwn && !['Rejected', 'Done'].includes(r.status);
  const canAct  = isTech && !['Rejected', 'Done'].includes(r.status);
  const voteCount = typeof r.upvotes === 'number' ? r.upvotes : (r.upvotes?.length ?? 0);

  const [voteOpen, setVoteOpen] = useState(false);
  const [customer, setCustomer] = useState('');
  const [voting, setVoting]     = useState(false);
  const [voted, setVoted]       = useState(false);
  const inputRef = useRef(null);

  const openVote = () => {
    setVoteOpen(true);
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  const submitVote = async () => {
    if (!customer.trim() || voting) return;
    setVoting(true);
    await onVote(r.id, customer.trim());
    setVoted(true);
    setVoteOpen(false);
    setCustomer('');
    setVoting(false);
  };

  const cancelVote = () => { setVoteOpen(false); setCustomer(''); };

  return (
    <tr className="req-row">
      {/* No. */}
      <td className="req-no">{idx}</td>

      {/* POC */}
      <td>
        <div className="req-poc-name">{r.submitter_name}</div>
        <div className="req-poc-customer">{r.customer_name}</div>
      </td>

      {/* Title */}
      <td>
        <button className="req-title-btn" onClick={onView}>{r.title}</button>
        <div style={{ marginTop: 5 }}>
          <StatusBadge status={r.status} />
        </div>
      </td>

      {/* Use case */}
      <td className="req-usecase">{truncate(r.use_case, 70)}</td>

      {/* Priority */}
      <td>
        <span className={`prio-badge prio-${r.current_priority}`}>{r.current_priority}</span>
      </td>

      {/* Jira */}
      <td>
        {r.jira_ticket_key ? (
          <div>
            <a href={r.jira_ticket_url} target="_blank" rel="noreferrer" className="jira-link">
              🔗 {r.jira_ticket_key}
            </a>
            {r.jira_assignee && (
              <div className="muted text-sm" style={{ marginTop: 3 }}>👤 {r.jira_assignee}</div>
            )}
            {canAct && (
              <button className="btn btn-sm btn-danger" style={{ marginTop: 6 }} onClick={onReject}>✕ Reject</button>
            )}
          </div>
        ) : isTech ? (
          <div className="jira-actions">
            <button className="btn btn-sm btn-primary" onClick={() => onJira('create')}>+ Create Jira</button>
            <button className="btn btn-sm" onClick={() => onJira('link')}>🔗 Link Jira</button>
            {canAct && <button className="btn btn-sm btn-danger" onClick={onReject}>✕ Reject</button>}
          </div>
        ) : (
          <span className="muted">—</span>
        )}
      </td>

      {/* Vote */}
      <td className="vote-cell">
        {isOwn ? (
          <span className="vote-own-tag">yours</span>
        ) : voted ? (
          <div className="vote-done">
            <span className="vote-done-icon">👍</span>
            <span className="vote-done-count">{voteCount}</span>
          </div>
        ) : canVote ? (
          <div className="vote-wrap">
            {!voteOpen ? (
              <button className="vote-btn" onClick={openVote}>
                <span className="vote-thumb">👍</span>
                <span className="vote-label">{voteCount > 0 ? voteCount : 'Vote'}</span>
              </button>
            ) : (
              <div className="vote-inline-wrap">
                <input
                  ref={inputRef}
                  className="vote-customer-input"
                  placeholder="Customer name…"
                  value={customer}
                  onChange={e => setCustomer(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') submitVote();
                    if (e.key === 'Escape') cancelVote();
                  }}
                />
                <div className="vote-inline-actions">
                  <button
                    className="vote-confirm-btn"
                    onClick={submitVote}
                    disabled={!customer.trim() || voting}
                    title="Confirm vote"
                  >
                    {voting ? '…' : '✓'}
                  </button>
                  <button className="vote-cancel-btn" onClick={cancelVote} title="Cancel">✕</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <span className="vote-static">{voteCount > 0 ? `👍 ${voteCount}` : '—'}</span>
        )}
      </td>

      {/* View */}
      <td>
        <button className="view-row-btn" onClick={onView} title="View details">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M3 8h10M9 4l4 4-4 4"/>
          </svg>
        </button>
      </td>
    </tr>
  );
}

// ─── Detail slide-over panel ──────────────────────────────
function DetailPanel({ id, user, isTech, onClose, onRefresh }) {
  const [data, setData]       = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [jiraOpen, setJiraOpen]     = useState(null);

  const reload = () => api.get(`/api/requirements/${id}`).then(setData).catch(console.error);
  useEffect(() => { reload(); }, [id]);

  // Close on Escape
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  const canAct = isTech && data && !['Rejected', 'Done'].includes(data.status);

  return (
    <>
      <div className="detail-overlay" onClick={onClose} />
      <div className="detail-panel">
        {/* Header */}
        <div className="detail-hd">
          <div className="detail-hd-title">{data?.title || 'Loading…'}</div>
          <button className="detail-close-btn" onClick={onClose}>✕</button>
        </div>

        {!data && (
          <div style={{ padding: 32, textAlign: 'center' }} className="muted">Loading…</div>
        )}

        {data && (
          <div className="detail-body">
            {/* Status + priority row */}
            <div className="detail-meta-row">
              <StatusBadge status={data.status} />
              <span className={`prio-badge prio-${data.current_priority}`}>{data.current_priority}</span>
              <span className="detail-category-tag">{data.category}</span>
            </div>

            {/* Raised by */}
            <div className="detail-raised-by">
              Raised by <strong>{data.submitter_name}</strong> · {data.created_at?.slice(0, 10)}
            </div>

            <div className="detail-divider" />

            {/* Customer */}
            <div className="detail-field">
              <div className="detail-field-label">Customer</div>
              <div className="detail-field-value">{data.customer_name} <span className="muted">· {data.customer_segment}</span></div>
            </div>

            {/* Description */}
            {data.description && (
              <div className="detail-field">
                <div className="detail-field-label">Description</div>
                <div className="detail-field-text">{data.description}</div>
              </div>
            )}

            {/* Use case */}
            {data.use_case && (
              <div className="detail-field">
                <div className="detail-field-label">Use Case</div>
                <div className="detail-field-text">{data.use_case}</div>
              </div>
            )}

            {/* Business impact */}
            {data.business_impact && (
              <div className="detail-field">
                <div className="detail-field-label">Business Impact</div>
                <div className="detail-field-text">{data.business_impact}</div>
              </div>
            )}

            {/* Jira */}
            {data.jira_ticket_key && (
              <div className="detail-field">
                <div className="detail-field-label">Jira Ticket</div>
                <a href={data.jira_ticket_url} target="_blank" rel="noreferrer" className="jira-link">
                  🔗 {data.jira_ticket_key}
                </a>
                {data.jira_assignee && <div className="muted text-sm" style={{ marginTop: 4 }}>👤 {data.jira_assignee}</div>}
                {data.jira_sprint    && <div className="muted text-sm">🏃 {data.jira_sprint}</div>}
              </div>
            )}

            {/* Rejection reason */}
            {data.status === 'Rejected' && data.rejection_reason && (
              <div className="detail-field">
                <div className="detail-field-label" style={{ color: '#ef4444' }}>Rejection Reason</div>
                <div className="detail-reject-reason">{data.rejection_reason}</div>
              </div>
            )}

            <div className="detail-divider" />

            {/* Votes */}
            <div className="detail-field">
              <div className="detail-field-label">
                Votes
                <span className="detail-vote-count-badge">{data.upvotes?.length ?? 0}</span>
              </div>
              {data.upvotes?.length === 0 && <div className="muted text-sm">No votes yet</div>}
              {data.upvotes?.map((v, i) => (
                <div key={i} className="detail-vote-item">
                  <span className="detail-vote-thumb">👍</span>
                  <span><strong>{v.user_name}</strong> · <em>{v.customer_name}</em></span>
                </div>
              ))}
            </div>

            {/* Tech actions */}
            {canAct && (
              <div className="detail-actions">
                {!data.jira_ticket_key && (
                  <>
                    <button className="btn btn-primary btn-sm" onClick={() => setJiraOpen('create')}>+ Create Jira</button>
                    <button className="btn btn-sm" onClick={() => setJiraOpen('link')}>🔗 Link Jira</button>
                  </>
                )}
                <button className="btn btn-sm btn-danger" onClick={() => setRejectOpen(true)}>✕ Reject</button>
              </div>
            )}
          </div>
        )}
      </div>

      {rejectOpen && (
        <RejectModal
          id={id}
          onClose={() => setRejectOpen(false)}
          onSuccess={() => { setRejectOpen(false); onClose(); onRefresh(); }}
        />
      )}
      {jiraOpen === 'create' && (
        <JiraCreateModal
          id={id}
          onClose={() => setJiraOpen(null)}
          onSuccess={() => { setJiraOpen(null); reload(); onRefresh(); }}
        />
      )}
      {jiraOpen === 'link' && (
        <JiraLinkModal
          id={id}
          onClose={() => setJiraOpen(null)}
          onSuccess={() => { setJiraOpen(null); reload(); onRefresh(); }}
        />
      )}
    </>
  );
}

// ─── Raise Modal ──────────────────────────────────────────
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
  const [error, setError] = useState(null);
  const [busy, setBusy]   = useState(false);

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
