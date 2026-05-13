import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import NotificationsBell from './NotificationsBell.jsx';

const PAGE_TITLES = {
  '/': 'Requirements',
  '/reports': 'Reports & Analytics',
  '/admin': 'Admin Panel',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const title = PAGE_TITLES[loc.pathname] || 'Requirement Detail';
  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="app">
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
            <span className="nav-icon">📋</span>
            Requirements
          </NavLink>

          <NavLink to="/reports">
            <span className="nav-icon">📊</span>
            Reports
          </NavLink>

          {user.role === 'admin' && (
            <>
              <div className="sidebar-section-label">Administration</div>
              <NavLink to="/admin">
                <span className="nav-icon">⚙️</span>
                Admin Panel
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-user-row">
            <div className="avatar">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sidebar-user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name}
              </div>
              <span className={`role-chip role-${user.role}`}>{user.role === 'tech' ? 'Tech' : user.role === 'cs' ? 'CS' : 'Admin'}</span>
            </div>
            <NotificationsBell />
          </div>
          <button className="sidebar-logout" onClick={logout}>
            🚪 Sign out
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <span className="topbar-title">{title}</span>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
