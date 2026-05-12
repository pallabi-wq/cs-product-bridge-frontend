import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';

const SEGMENTS = ['Enterprise','Mid-Market','SMB'];
const PRIORITIES = ['Low','Medium','High','Critical'];
const CATEGORIES = ['Bug','Feature','Enhancement','Integration','UX'];

export default function RaiseRequirement() {
  const [sp] = useSearchParams();
  const resubmittedFromId = sp.get('resubmit') || null;

  const [form, setForm] = useState({
    title: '',
    description: '',
    customer_name: '',
    customer_segment: 'Mid-Market',
    business_impact: '',
    category: 'Feature',
    use_case: '',
    priority: 'Medium',
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null); setBusy(true);
    try {
      const res = await api.post('/api/requirements', {
        ...form,
        resubmitted_from_id: resubmittedFromId,
      });
      nav(`/requirements/${res.id}`);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <h1>Raise a requirement</h1>
      {resubmittedFromId && (
        <p className="muted">Resubmitting from a previously rejected requirement. Add the additional context that addresses the rejection reason.</p>
      )}
      <form onSubmit={submit}>
        <div className="field">
          <label>Title <span className="muted">*</span></label>
          <input value={form.title} onChange={e => update('title', e.target.value)} required />
        </div>
        <div className="field">
          <label>Detailed description <span className="muted">*</span></label>
          <textarea value={form.description} onChange={e => update('description', e.target.value)} required />
        </div>
        <div className="row">
          <div className="field">
            <label>Customer / account <span className="muted">*</span></label>
            <input value={form.customer_name} onChange={e => update('customer_name', e.target.value)} required />
          </div>
          <div className="field">
            <label>Customer segment</label>
            <select value={form.customer_segment} onChange={e => update('customer_segment', e.target.value)}>
              {SEGMENTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Business impact</label>
          <textarea value={form.business_impact} onChange={e => update('business_impact', e.target.value)}
            placeholder="Revenue at risk, churn risk, retention, upsell opportunity..." />
        </div>
        <div className="row">
          <div className="field">
            <label>Priority (CS-set, Product can override)</label>
            <select value={form.priority} onChange={e => update('priority', e.target.value)}>
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Category</label>
            <select value={form.category} onChange={e => update('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Use case or example scenario</label>
          <textarea value={form.use_case} onChange={e => update('use_case', e.target.value)} />
        </div>
        <div className="field">
          <label>Attachments</label>
          <input type="file" multiple disabled />
          <div className="hint">Attachments wired in scaffold via /uploads (storage stub). Hook to S3/GCS before prod.</div>
        </div>

        {error && <div className="error-msg">{error}</div>}
        <div style={{ display:'flex', gap: 8, marginTop: 16 }}>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Submitting…' : 'Submit requirement'}
          </button>
          <button type="button" className="btn" onClick={() => nav('/')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
