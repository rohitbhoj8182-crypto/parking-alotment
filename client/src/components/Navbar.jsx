import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <header className="nav">
      <div className="nav-inner">
        <span className="brand"><i className="brand-mark" />Bayline</span>
        <nav className="nav-links">
          <NavLink to="/" end>Find parking</NavLink>
          <NavLink to="/bookings">My bookings</NavLink>
          {user.role === 'admin' && <NavLink to="/admin">Manage parking</NavLink>}
        </nav>
        <div className="nav-user">
          <span>{user.name}</span>
          <button className="btn ghost sm" onClick={() => { logout(); nav('/login'); }}>Log out</button>
        </div>
      </div>
    </header>
  );
}
