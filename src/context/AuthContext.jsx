import { createContext, useContext, useState } from 'react';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem('cspb_user') || 'null')
  );

  const login = (u) => {
    // Strip password_hash before storing
    const { password_hash, ...safe } = u;
    localStorage.setItem('cspb_user', JSON.stringify(safe));
    setUser(safe);
  };

  const logout = () => {
    localStorage.removeItem('cspb_user');
    setUser(null);
  };

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
