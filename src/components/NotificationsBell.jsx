import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const ref = useRef();

  const load = () => api.get('/api/notifications').then(setItems).catch(() => {});

  useEffect(() => {
    load();
    const id = setInterval(load, 5000); // poll
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const unread = items.filter(n => !n.read_at);
  const markAllRead = async () => {
    if (!unread.length) return;
    await api.post('/api/notifications/mark-read', { ids: unread.map(n => n.id) });
    load();
  };

  return (
    <div className="notif-dropdown" ref={ref}>
      <div className="notif-bell" onClick={() => { setOpen(!open); }}>
        Notifications
        {unread.length > 0 && <span className="notif-count">{unread.length}</span>}
      </div>
      {open && (
        <div className="notif-list">
          <div style={{ padding: 10, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
            <strong>Notifications</strong>
            <button className="btn btn-sm" onClick={markAllRead} disabled={!unread.length}>Mark all read</button>
          </div>
          {items.length === 0 && <div className="notif-empty">No notifications.</div>}
          {items.slice(0, 15).map(n => (
            <Link key={n.id} to={`/requirements/${n.requirement_id}`} style={{ textDecoration:'none', color:'inherit' }}>
              <div className={`notif-item ${n.read_at ? '' : 'unread'}`} onClick={() => setOpen(false)}>
                <div>{n.message}</div>
                <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{n.created_at}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
