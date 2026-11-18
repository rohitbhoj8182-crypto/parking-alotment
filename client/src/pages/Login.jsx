import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../api.js';
import AuthShell from '../components/AuthShell.jsx';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try { await login(form); } catch (err) { setError(errMsg(err)); setBusy(false); }
  };

  return (
    <AuthShell title="Welcome back" sub="Log in to see which bays are free right now.">
      <form onSubmit={submit}>
        <label>Email
          <input type="email" placeholder="you@gmail.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoFocus />
        </label>
        <label>Password
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </label>
        {error && <div className="alert">{error}</div>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
      <p className="muted center">New here? <Link to="/register">Create an account</Link></p>
      <p className="muted center">Lot manager? <Link to="/admin-login">Admin login</Link></p>
    </AuthShell>
  );
}
