import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const PAGE_META = {
  '/':      { title: 'Requirements', sub: 'Track and prioritise product requests' },
  '/admin': { title: 'Admin Panel',  sub: 'Team members and integrations' },
};

const IconReq = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="12" height="12" rx="2"/>
    <path d="M5 6h6M5 8.5h4M5 11h3"/>
  </svg>
);
const IconAdmin = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="2.5"/>
    <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4"/>
  </svg>
);

export default function Layout() {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const page = PAGE_META[loc.pathname] || { title: 'Requirement Detail', sub: '' };
  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const isCS = user.role === 'cs' || user.role === 'admin';
  const isReqPage = loc.pathname === '/';

  const handleRaise = () => window.dispatchEvent(new CustomEvent('raise-requirement'));

  return (
    <div className="app">
      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">🌉</div>
          <div>
            <div className="sidebar-brand-name">TagMango</div>
            <div className="sidebar-brand-sub">CS · Product Bridge</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Menu</div>
          <NavLink to="/" end>
            <span className="nav-icon"><IconReq /></span>Requirements
          </NavLink>
          {user.role === 'admin' && (
            <>
              <div className="sidebar-section-label">Administration</div>
              <NavLink to="/admin">
                <span className="nav-icon"><IconAdmin /></span>Admin Panel
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-user-row">
            <div className="avatar">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sidebar-user-name">{user.name}</div>
              <span className={`role-chip role-${user.role}`}>
                {user.role === 'tech' ? 'Tech' : user.role === 'cs' ? 'CS' : 'Admin'}
              </span>
            </div>
          </div>
          <button className="sidebar-logout" onClick={logout}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M9 2h3a1 1 0 011 1v8a1 1 0 01-1 1H9M6 10l3-3-3-3M1 7h8"/>
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────── */}
      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-title">{page.title}</div>
            {page.sub && <div className="topbar-sub">{page.sub}</div>}
          </div>
          {/* Raise Requirement lives in the topbar */}
          {isReqPage && isCS && (
            <button className="btn btn-primary topbar-raise-btn" onClick={handleRaise}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M6.5 1v11M1 6.5h11"/>
              </svg>
              Raise Requirement
            </button>
          )}
        </header>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
