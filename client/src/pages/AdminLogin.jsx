import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../api.js';
import AuthShell from '../components/AuthShell.jsx';

export default function AdminLogin() {
  const { adminLogin, adminRegister } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [form, setForm] = useState({ name: '', email: '', password: '', secretKey: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await adminLogin({ email: form.email, password: form.password, secretKey: form.secretKey });
      else await adminRegister(form);
    } catch (err) { setError(errMsg(err)); setBusy(false); }
  };

  const signup = mode === 'signup';
  return (
    <AuthShell title={signup ? 'Create an admin account' : 'Admin login'} sub="For lot managers. You need the secret key from the owner.">
      <div className="seg wide tabs">
        <button type="button" className={!signup ? 'on' : ''} onClick={() => { setMode('login'); setError(''); }}>Log in</button>
        <button type="button" className={signup ? 'on' : ''} onClick={() => { setMode('signup'); setError(''); }}>Sign up</button>
      </div>
      <form onSubmit={submit}>
        {signup && <label>Full name<input value={form.name} onChange={set('name')} required /></label>}
        <label>Email<input type="email" placeholder="you@gmail.com" value={form.email} onChange={set('email')} required autoFocus /></label>
        <label>Password<input type="password" minLength={signup ? 6 : undefined} value={form.password} onChange={set('password')} required /></label>
        <label>Admin secret key<input type="password" autoComplete="off" value={form.secretKey} onChange={set('secretKey')} required /></label>
        {error && <div className="alert">{error}</div>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Please wait…' : signup ? 'Create admin account' : 'Log in as admin'}</button>
      </form>
      <p className="muted center"><Link to="/login">Back to driver login</Link></p>
    </AuthShell>
  );
}
