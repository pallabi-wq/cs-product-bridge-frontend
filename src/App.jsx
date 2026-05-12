import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import RaiseRequirement from './pages/RaiseRequirement.jsx';
import RequirementDetail from './pages/RequirementDetail.jsx';
import Reports from './pages/Reports.jsx';
import Admin from './pages/Admin.jsx';

export default function App() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/raise" element={<RaiseRequirement />} />
        <Route path="/requirements/:id" element={<RequirementDetail />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/admin" element={user.role === 'admin' ? <Admin /> : <Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  );
}
