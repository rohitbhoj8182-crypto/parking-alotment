import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../api.js';
import AuthShell from '../components/AuthShell.jsx';

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try { await register(form); } catch (err) { setError(errMsg(err)); setBusy(false); }
  };

  return (
    <AuthShell title="Create your account" sub="It takes a few seconds. No card needed.">
      <form onSubmit={submit}>
        <label>Full name
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
        </label>
        <label>Email
          <input type="email" placeholder="you@gmail.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </label>
        <label>Password
          <input type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <small className="muted">At least 6 characters.</small>
        </label>
        {error && <div className="alert">{error}</div>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
      </form>
      <p className="muted center">Already registered? <Link to="/login">Log in</Link></p>
    </AuthShell>
  );
}
