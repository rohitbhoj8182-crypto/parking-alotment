import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (e) => {
    // expired/invalid session: clear it and go to login (login failures have no stored token, so they pass through)
    if (e.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(e);
  }
);

export const errMsg = (e) => e.response?.data?.message || 'Could not reach the server. Check your connection and try again.';
export const money = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
export const when = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
export default api;
