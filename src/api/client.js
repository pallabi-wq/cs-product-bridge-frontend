// Thin fetch wrapper. Attaches x-user-id (stand-in for SSO) to every request.
// In production, VITE_API_BASE points to the Supabase Edge Function base URL
// (e.g. https://<project>.supabase.co/functions/v1/api). In dev, it's empty
// and the Vite proxy forwards /api/* to localhost:4000.
const API_BASE = import.meta.env.VITE_API_BASE || '';

function userId() {
  return JSON.parse(localStorage.getItem('cspb_user') || 'null')?.id || '';
}

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'x-user-id': userId() },
  };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(API_BASE + path, opts);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = (await res.json()).error || msg; } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

export const api = {
  get:  (p) => request('GET',  p),
  post: (p, b) => request('POST',  p, b),
  del:  (p) => request('DELETE', p),

  // helpers
  downloadCsv(query) {
    const url = `${API_BASE}/api/requirements?${new URLSearchParams({ ...query, format: 'csv' })}`;
    fetch(url, { headers: { 'x-user-id': userId() } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'requirements.csv';
        a.click();
      });
  },
};
