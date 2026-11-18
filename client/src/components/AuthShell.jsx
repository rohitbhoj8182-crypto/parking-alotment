// Decorative bay pattern: green = vacant, red = taken. Same colour language as the dashboard.
const BAYS = 'gggrggrgrggggrrgggrgrggg'.split('');

export default function AuthShell({ title, sub, children }) {
  return (
    <div className="auth">
      <aside className="auth-side">
        <span className="brand light"><i className="brand-mark" />Bayline</span>
        <div>
          <h1>Know before you drive in.</h1>
          <p>Green bays are open. Red bays are taken. Pick one and park.</p>
          <div className="bays" aria-hidden="true">
            {BAYS.map((c, i) => <i key={i} className={c === 'g' ? 'g' : 'r'} />)}
          </div>
        </div>
      </aside>
      <section className="auth-form">
        <div className="auth-card">
          <h2>{title}</h2>
          <p className="muted">{sub}</p>
          {children}
        </div>
      </section>
    </div>
  );
}
