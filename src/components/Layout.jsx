import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import NotificationsBell from './NotificationsBell.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="app">
      <nav className="nav">
        <div className="brand">CS · Product Bridge</div>
        <div className="links">
          <NavLink to="/" end>Dashboard</NavLink>
          {(user.role === 'cs' || user.role === 'admin') && <NavLink to="/raise">Raise</NavLink>}
          <NavLink to="/reports">Reports</NavLink>
          {user.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
        </div>
        <NotificationsBell />
        <div className="user">
          <span>{user.name}</span>
          <span className="role-chip">{user.role}</span>
          <button className="btn btn-sm" onClick={logout}>Switch user</button>
        </div>
      </nav>
      <div className="content">
        <Outlet />
      </div>
    </div>
  );
}
