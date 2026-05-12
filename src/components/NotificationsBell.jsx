import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

export default function NotificationsBell() {
  const [open, setOpen]   = useState(false);
  const [items, setItems] = useState([]);
  const ref = useRef();

  const load = () => api.get('/api/notifications').then(setItems).catch(() => {});

  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const unread = items.filter(n => !n.read_at);

  const markAllRead = async () => {
    if (!unread.length) return;
    await api.post('/api/notifications/mark-read', { ids: unread.map(n => n.id) });
    load();
  };

  const fmt = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' +
           d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="notif-wrap" ref={ref}>
      <button className="notif-btn" onClick={() => setOpen(v => !v)} title="Notifications">
        🔔
        {unread.length > 0 && <span className="notif-count">{unread.length}</span>}
      </button>

      {open && (
        <div className="notif-list">
          <div className="notif-list-head">
            <span>Notifications</span>
            <button className="btn btn-sm btn-ghost" onClick={markAllRead} disabled={!unread.length}>
              Mark all read
            </button>
          </div>

          {items.length === 0 && (
            <div className="notif-empty">You're all caught up 🎉</div>
          )}

          {items.slice(0, 20).map(n => (
            <Link
              key={n.id}
              to={`/requirements/${n.requirement_id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className={`notif-item ${n.read_at ? '' : 'unread'}`} onClick={() => setOpen(false)}>
                <div>{n.message}</div>
                <div className="muted text-sm" style={{ marginTop: 3 }}>{fmt(n.created_at)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
