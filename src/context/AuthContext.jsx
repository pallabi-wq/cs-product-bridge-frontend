// Auth context — stand-in for SSO during development.
// Replace with a real session/OIDC-driven provider in production.
import { createContext, useContext, useEffect, useState } from 'react';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('cspb_user') || 'null'));

  const login = (u) => {
    localStorage.setItem('cspb_user', JSON.stringify(u));
    setUser(u);
  };
  const logout = () => {
    localStorage.removeItem('cspb_user');
    setUser(null);
  };

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
