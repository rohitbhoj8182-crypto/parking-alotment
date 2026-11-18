import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    api.get('/auth/me')
      .then((r) => setUser(r.data.user))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const authenticate = useCallback(async (path, body) => {
    const { data } = await api.post(path, body);
    localStorage.setItem('token', data.token);
    setUser(data.user);
  }, []);

  const login = (body) => authenticate('/auth/login', body);
  const adminLogin = (body) => authenticate('/auth/admin/login', body);
  const adminRegister = (body) => authenticate('/auth/admin/register', body);
  const register = (body) => authenticate('/auth/register', body);
  const logout = () => { localStorage.removeItem('token'); setUser(null); };

  return <AuthContext.Provider value={{ user, loading, login, register, adminLogin, adminRegister, logout }}>{children}</AuthContext.Provider>;
}
