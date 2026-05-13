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
  { key: 'open',     label: 'Open',     desc: 'Active & in review',   color: '#2563eb', bg: '#eff6ff', border: '#93c5fd', dot: '#3b82f6' },
  { key: 'resolved', label: 'Resolved', desc: 'Completed & shipped',  color: '#059669', bg: '#ecfdf5', border: '#6ee7b7', dot: '#10b981' },
  { key: 'rejected', label: 'Rejected', desc: 'Closed without action',color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', dot: '#ef4444' },
];

// ─── main component ───────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const isCS   = user.role === 'cs' || user.role === 'admin';
  const isTech = user.role === 'tech' || user.role === 'admin';

  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [activeTab, setActiveTab] = useState('open');
  const [search, setSearch]   = useState('');
  const [detailId, setDetailId] = useState(null);

  const [sortDesc, setSortDesc]       = useState(true);   // true = newest first
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
    // Listen for Raise Requirement trigger from topbar
    const handler = () => setRaiseOpen(true);
    window.addEventListener('raise-requirement', handler);
    return () => { clearInterval(t); window.removeEventListener('raise-requirement', handler); };
  }, []);

  const tabCounts = {
    all:      rows.length,
    open:     rows.filter(r => OPEN_STATUSES.includes(r.status)).length,
    resolved: rows.filter(r => r.status === 'Done').length,
    rejected: rows.filter(r => r.status === 'Rejected').length,
  };

  // Stable REQ numbers — oldest requirement is always REQ-001 regardless of sort order
  const reqNumMap = {};
  [...rows].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .forEach((r, i) => { reqNumMap[r.id] = i + 1; });

  const filtered = rows
    .filter(r => {
      const matchTab =
        activeTab === 'open'     ? OPEN_STATUSES.includes(r.status) :
        activeTab === 'rejected' ? r.status === 'Rejected' :
        activeTab === 'resolved' ? r.status === 'Done' : true;
      const q = search.toLowerCase();
      const matchSearch = !q || [r.title, r.customer_name, r.submitter_name, r.use_case]
        .some(v => v?.toLowerCase().includes(q));
      return matchTab && matchSearch;
    })
    .sort((a, b) => {
      const da = new Date(a.created_at), db = new Date(b.created_at);
      return sortDesc ? db - da : da - db;
    });

  // Optimistic vote handler — customer_name uses the logged-in user's name (required by API)
  const handleVote = async (reqId) => {
    setRows(prev => prev.map(r =>
      r.id === reqId
        ? { ...r, upvotes: (typeof r.upvotes === 'number' ? r.upvotes : (r.upvotes?.length ?? 0)) + 1 }
        : r
    ));
    try {
      await api.post(`/api/requirements/${reqId}/upvote`, { customer_name: user.name });
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
      {/* ── Search toolbar ─────────────────────────────────── */}
      <div className="dash-toolbar">
        <div className="req-search-wrap">
          <svg className="req-search-ico" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="8.5" cy="8.5" r="5.5"/><path d="M15 15l-3-3"/>
          </svg>
          <input
            className="req-search-input"
            type="text"
            placeholder="Search by title, customer, POC…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="req-search-clear" onClick={() => setSearch('')}>✕</button>
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
              <div className="stat-card-top">
                <span className="stat-card-dot" style={{ background: c.dot }} />
                <span className="stat-card-label" style={active ? { color: c.color } : {}}>{c.label}</span>
              </div>
              <div className="stat-card-count" style={active ? { color: c.color } : {}}>{tabCounts[c.key]}</div>
              <div className="stat-card-desc">{c.desc}</div>
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
              <th style={{ width: 100 }}>
                <button className="sort-th-btn" onClick={() => setSortDesc(d => !d)}>
                  Req No.
                  {sortDesc
                    ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 1v8M2 6l3 3 3-3"/></svg>
                    : <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 9V1M2 4l3-3 3 3"/></svg>
                  }
                </button>
              </th>
              <th style={{ width: 150 }}>POC</th>
              <th>Title</th>
              <th style={{ width: 210 }}>Use Case</th>
              <th style={{ width: 95 }}>Priority</th>
              <th style={{ width: 185 }}>Status</th>
              <th style={{ width: 130, textAlign: 'center' }}>Vote</th>
              <th style={{ width: 80 }}>Action</th>
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
            {filtered.map((r) => (
              <RequirementRow
                key={r.id}
                idx={reqNumMap[r.id] ?? 0}
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
          isCS={isCS}
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

  const [voting, setVoting] = useState(false);
  const [voted, setVoted]   = useState(false);

  const submitVote = async () => {
    if (voting) return;
    setVoting(true);
    await onVote(r.id);
    setVoted(true);
    setVoting(false);
  };

  const reqNo = `REQ-${String(idx).padStart(3, '0')}`;

  return (
    <tr className="req-row">
      {/* No. */}
      <td className="req-no">
        <span className="req-no-plain">{reqNo}</span>
      </td>

      {/* POC */}
      <td>
        <span className="req-poc-name">{r.submitter_name}</span>
      </td>

      {/* Title */}
      <td>
        <button className="req-title-btn" onClick={onView}>{r.title}</button>
      </td>

      {/* Use case */}
      <td className="req-usecase">{truncate(r.use_case, 70)}</td>

      {/* Priority */}
      <td>
        <span className={`prio-badge prio-${r.current_priority}`}>{r.current_priority}</span>
      </td>

      {/* Status / Jira */}
      <td>
        {r.status === 'Rejected' ? (
          /* ── Rejected ── */
          <button className="status-rejected-cell" onClick={onView}>
            <span className="status-rejected-text">Rejected</span>
            <span className="status-view-reason">View reason →</span>
          </button>
        ) : r.jira_ticket_key ? (
          /* ── Jira linked: show key + current status ── */
          <div className="jira-linked">
            <a href={r.jira_ticket_url} target="_blank" rel="noreferrer" className="jira-link">
              {r.jira_ticket_key}
            </a>
            {r.status && <div className="jira-status-label">{r.status}</div>}
          </div>
        ) : (
          <span className="muted text-sm">—</span>
        )}
      </td>

      {/* Vote */}
      <td className="vote-cell">
        {isOwn ? (
          <div className="vote-own-wrap">
            <span className="vote-own-count">👍 {voteCount}</span>
            <span className="vote-own-tag">yours</span>
          </div>
        ) : voted ? (
          <div className="vote-done">
            <span className="vote-done-icon">👍</span>
            <span className="vote-done-count">{voteCount}</span>
          </div>
        ) : canVote ? (
          <div className="vote-wrap">
            <button className="vote-btn" onClick={submitVote} disabled={voting}>
              <span className="vote-thumb">👍</span>
              <span className="vote-label">{voting ? '…' : voteCount > 0 ? voteCount : 'Vote'}</span>
            </button>
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
function DetailPanel({ id, user, isCS, isTech, onClose, onRefresh }) {
  const [data, setData]             = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [jiraOpen, setJiraOpen]     = useState(null);
  const [reopenOpen, setReopenOpen] = useState(false);

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

            {/* Status + meta */}
            <div className="detail-status-strip">
              <StatusBadge status={data.status} />
              <span className="detail-strip-dot">·</span>
              <span className="detail-raised-meta">by <strong>{data.submitter_name}</strong></span>
              <span className="detail-strip-dot">·</span>
              <span className="detail-raised-meta">{data.created_at?.slice(0, 10)}</span>
            </div>

            <div className="detail-divider" />

            {/* Use case */}
            {data.use_case && (
              <div className="detail-row">
                <div className="detail-row-label">Use Case</div>
                <div className="detail-row-text">{data.use_case}</div>
              </div>
            )}

            {/* Priority */}
            <div className="detail-row">
              <div className="detail-row-label">Priority</div>
              <span className={`prio-badge prio-${data.current_priority}`}>{data.current_priority}</span>
            </div>

            {/* Category */}
            <div className="detail-row">
              <div className="detail-row-label">Category</div>
              <span className="detail-row-value">{data.category}</span>
            </div>

            {/* Customer */}
            {data.customer_name && (
              <div className="detail-row">
                <div className="detail-row-label">Customer</div>
                <span className="detail-row-value">{data.customer_name}</span>
              </div>
            )}

            {/* Jira */}
            {data.jira_ticket_key && (
              <div className="detail-row">
                <div className="detail-row-label">Jira</div>
                <div className="detail-jira-info">
                  <a href={data.jira_ticket_url} target="_blank" rel="noreferrer" className="jira-link">
                    {data.jira_ticket_key}
                  </a>
                  {data.jira_assignee && <span className="detail-jira-meta">👤 {data.jira_assignee}</span>}
                  {data.jira_sprint    && <span className="detail-jira-meta">🏃 {data.jira_sprint}</span>}
                </div>
              </div>
            )}

            {/* Rejection reason */}
            {data.status === 'Rejected' && data.rejection_reason && (
              <div className="detail-reject-block">
                <div className="detail-reject-block-label">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="6" cy="6" r="5"/><path d="M6 3.5v3M6 8.5v.5"/></svg>
                  Rejection Reason
                </div>
                <div className="detail-reject-block-text">{data.rejection_reason}</div>
              </div>
            )}

            <div className="detail-divider" />

            {/* Votes */}
            <div className="detail-row" style={{ alignItems: 'flex-start' }}>
              <div className="detail-row-label" style={{ paddingTop: 2 }}>
                Votes <span className="detail-vote-count-badge">{data.upvotes?.length ?? 0}</span>
              </div>
              <div>
                {(data.upvotes?.length ?? 0) === 0
                  ? <span className="detail-no-votes">No votes yet</span>
                  : data.upvotes.map((v, i) => (
                      <div key={i} className="detail-vote-item">
                        <span className="detail-vote-thumb">👍</span>
                        <span className="detail-vote-name">{v.user_name}</span>
                        {v.customer_name && v.customer_name !== v.user_name && (
                          <span className="detail-vote-customer"> · {v.customer_name}</span>
                        )}
                      </div>
                    ))
                }
              </div>
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

            {/* CS reopen action — only for rejected requirements */}
            {isCS && data.status === 'Rejected' && (
              <div className="detail-actions">
                <button className="btn btn-primary btn-sm" onClick={() => setReopenOpen(true)}>
                  ↩ Request Re-review
                </button>
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
      {reopenOpen && (
        <ReopenModal
          id={id}
          onClose={() => setReopenOpen(false)}
          onSuccess={() => { setReopenOpen(false); onClose(); onRefresh(); }}
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
const PRIO_OPTIONS = [
  { value: 'Low',      label: 'Low',      color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db' },
  { value: 'Medium',   label: 'Medium',   color: '#2563eb', bg: '#eff6ff', border: '#93c5fd' },
  { value: 'High',     label: 'High',     color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  { value: 'Critical', label: 'Critical', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
];

function RaiseModal({ onClose, onSuccess }) {
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    title: '', use_case: '', priority: 'Medium',
    customer_name: '', category: 'Feature',
  });
  const [attachment, setAttachment] = useState(null);
  const [dragging, setDragging]     = useState(false);
  const [error, setError]           = useState(null);
  const [busy, setBusy]             = useState(false);
  const up = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleFile = (file) => {
    if (!file) return;
    setAttachment({ name: file.name, size: file.size, type: file.type });
  };

  const canSubmit = form.title.trim() && form.use_case.trim() && !busy;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null); setBusy(true);
    try {
      await api.post('/api/requirements', {
        title:            form.title.trim(),
        description:      form.use_case.trim(),
        use_case:         form.use_case.trim(),
        customer_name:    form.customer_name.trim(),
        customer_segment: 'Mid-Market',
        category:         form.category,
        priority:         form.priority,
        business_impact:  '',
      });
      onSuccess();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="raise-modal" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="raise-hd">
          <div className="raise-hd-left">
            <div className="raise-hd-icon">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <path d="M9 2v14M2 9h14"/>
              </svg>
            </div>
            <div>
              <div className="raise-hd-title">Raise a Requirement</div>
              <div className="raise-hd-sub">Submit a product request for the tech team</div>
            </div>
          </div>
          <button className="raise-close-btn" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M2 2l10 10M12 2L2 12"/>
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <form className="raise-body" onSubmit={submit}>

          {/* Title */}
          <div className="raise-field">
            <label className="raise-label">
              Title <span className="raise-req">*</span>
            </label>
            <input
              className="raise-input"
              autoFocus
              required
              value={form.title}
              onChange={e => up('title', e.target.value)}
              placeholder="e.g. Add CSV export for customer reports"
            />
          </div>

          {/* Use case */}
          <div className="raise-field">
            <label className="raise-label">
              Use Case <span className="raise-req">*</span>
            </label>
            <textarea
              className="raise-textarea"
              required
              value={form.use_case}
              onChange={e => up('use_case', e.target.value)}
              placeholder="Describe how customers will use this and the problem it solves…"
            />
          </div>

          {/* Attachment */}
          <div className="raise-field">
            <label className="raise-label">Attachment</label>
            {attachment ? (
              <div className="raise-file-preview">
                <div className="raise-file-icon">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round"><path d="M9 2H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V6M9 2l4 4M9 2v4h4"/></svg>
                </div>
                <div className="raise-file-info">
                  <div className="raise-file-name">{attachment.name}</div>
                  <div className="raise-file-size">{(attachment.size / 1024).toFixed(0)} KB</div>
                </div>
                <button type="button" className="raise-file-remove" onClick={() => setAttachment(null)}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 2l8 8M10 2L2 10"/></svg>
                </button>
              </div>
            ) : (
              <div
                className={`raise-dropzone${dragging ? ' raise-dropzone-active' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
                onClick={() => fileRef.current?.click()}
              >
                <div className="raise-dropzone-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                  </svg>
                </div>
                <div className="raise-dropzone-text">
                  <span className="raise-dropzone-link">Click to upload</span> or drag and drop
                </div>
                <div className="raise-dropzone-hint">PNG, JPG, PDF, XLSX — up to 10 MB</div>
                <input ref={fileRef} type="file" style={{ display: 'none' }} accept=".png,.jpg,.jpeg,.pdf,.xlsx,.csv,.docx" onChange={e => handleFile(e.target.files[0])} />
              </div>
            )}
          </div>

          {/* Priority */}
          <div className="raise-field">
            <label className="raise-label">
              Priority <span className="raise-req">*</span>
            </label>
            <div className="raise-prio-group">
              {PRIO_OPTIONS.map(p => {
                const active = form.priority === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    className={`raise-prio-btn${active ? ' raise-prio-active' : ''}`}
                    style={active ? { background: p.bg, color: p.color, borderColor: p.border } : {}}
                    onClick={() => up('priority', p.value)}
                  >
                    <span className="raise-prio-dot" style={{ background: active ? p.color : '#d1d5db' }} />
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Customer + Category */}
          <div className="raise-row">
            <div className="raise-field" style={{ flex: 1 }}>
              <label className="raise-label">Customer / Account</label>
              <input
                className="raise-input"
                value={form.customer_name}
                onChange={e => up('customer_name', e.target.value)}
                placeholder="Acme Corp"
              />
            </div>
            <div className="raise-field" style={{ flex: 1 }}>
              <label className="raise-label">Category</label>
              <select className="raise-select" value={form.category} onChange={e => up('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {error && <div className="error-msg" style={{ marginBottom: 8 }}>{error}</div>}

          {/* Submit */}
          <button
            type="submit"
            className="raise-submit-btn"
            disabled={!canSubmit}
          >
            {busy ? (
              <><div className="raise-spinner" /> Submitting…</>
            ) : (
              <><svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M7.5 1v13M1 7.5h13"/></svg> Submit Requirement</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Reject Modal ─────────────────────────────────────────
function RejectModal({ id, onClose, onSuccess }) {
  const [reason, setReason] = useState('');
  const [error, setError]   = useState(null);
  const [busy, setBusy]     = useState(false);

  const submit = async () => {
    if (!reason.trim()) return;
    setBusy(true); setError(null);
    try {
      await api.post(`/api/requirements/${id}/reject`, { reason: reason.trim() });
      onSuccess();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const canSubmit = reason.trim().length > 0 && !busy;

  return (
    <Modal title="Reject Requirement" onClose={onClose} footer={
      <>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-danger"
          onClick={submit}
          disabled={!canSubmit}
          style={canSubmit ? {} : { opacity: 0.4 }}
        >
          {busy ? 'Rejecting…' : '✕ Reject'}
        </button>
      </>
    }>
      <div className="reject-modal-warning">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round"><circle cx="8" cy="8" r="6.5"/><path d="M8 5v3M8 10.5v.5"/></svg>
        This will permanently close the requirement. The submitter will be notified.
      </div>
      <div className="field" style={{ marginTop: 16 }}>
        <label>Rejection reason <span style={{ color: '#dc2626' }}>*</span></label>
        <textarea
          autoFocus
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Explain why this is being rejected…"
          style={{ minHeight: 100 }}
        />
        {reason.trim().length > 0 && (
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
            {reason.trim().length} characters
          </div>
        )}
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

// ─── Reopen Modal ────────────────────────────────────────
function ReopenModal({ id, onClose, onSuccess }) {
  const [comment, setComment] = useState('');
  const [error, setError]     = useState(null);
  const [busy, setBusy]       = useState(false);

  const submit = async () => {
    if (!comment.trim()) return;
    setBusy(true); setError(null);
    try {
      await api.post(`/api/requirements/${id}/reopen`, { comment: comment.trim() });
      onSuccess();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Modal title="Request Re-review" onClose={onClose} footer={
      <>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={!comment.trim() || busy}>
          {busy ? 'Submitting…' : 'Submit for Re-review'}
        </button>
      </>
    }>
      <p className="muted text-sm" style={{ marginBottom: 14 }}>
        Explain what has changed or why this should be reconsidered. This will be added as a comment and the requirement will be re-opened.
      </p>
      <div className="field">
        <label>Comment</label>
        <textarea
          autoFocus
          rows={4}
          placeholder="e.g. We've validated this with 3 enterprise customers who confirmed it's blocking their workflow…"
          value={comment}
          onChange={e => setComment(e.target.value)}
        />
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
