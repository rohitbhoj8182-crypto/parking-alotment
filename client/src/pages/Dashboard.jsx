import { useCallback, useEffect, useRef, useState } from 'react';
import api, { errMsg, money } from '../api.js';
import FilterBar from '../components/FilterBar.jsx';
import SlotCard from '../components/SlotCard.jsx';
import BookModal from '../components/BookModal.jsx';

export default function Dashboard() {
  const [filters, setFilters] = useState({ lot: '', status: '', type: '', pricing: '', vehicleSize: '' });
  const [slots, setSlots] = useState(null);
  const [lots, setLots] = useState([]);
  const [stats, setStats] = useState({ vacant: 0, occupied: 0, total: 0 });
  const [booking, setBooking] = useState(null);
  const [notice, setNotice] = useState(null);
  const timer = useRef();

  const show = (text, kind = 'ok') => {
    setNotice({ text, kind });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(null), 4000);
  };

  const load = useCallback(async () => {
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const [s, st, l] = await Promise.all([
        api.get('/slots', { params }),
        api.get('/slots/stats', { params: filters.lot ? { lot: filters.lot } : {} }),
        api.get('/lots'),
      ]);
      setSlots(s.data);
      setStats(st.data);
      setLots(l.data);
    } catch (e) {
      show(errMsg(e), 'err');
      setSlots((prev) => prev || []);
    }
  }, [filters]);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000); // keep colours fresh when others park or leave
    return () => clearInterval(id);
  }, [load]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const release = async (slot) => {
    if (!window.confirm(`Release slot ${slot.code} and end your parking?`)) return;
    try {
      const { data } = await api.patch(`/bookings/${slot.bookingId}/release`);
      show(data.amount > 0 ? `Slot ${slot.code} released. Amount due: ${money(data.amount)}` : `Slot ${slot.code} released. No charge.`);
    } catch (e) { show(errMsg(e), 'err'); }
    load();
  };

  const byLot = {};
  (slots || []).forEach((s) => { (byLot[s.lot] = byLot[s.lot] || []).push(s); });
  const visibleLots = lots.filter((l) => byLot[l._id]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Find parking</h1>
          <p className="muted">Pick a green bay to park. Your own car shows with a blue outline.</p>
        </div>
        <div className="counts">
          <div><b className="g">{stats.vacant}</b> vacant</div>
          <div><b className="r">{stats.occupied}</b> occupied</div>
        </div>
      </div>

      <FilterBar filters={filters} onChange={setFilters} lots={lots} />

      {notice && <div className={`toast ${notice.kind}`} role="status">{notice.text}</div>}

      {slots === null ? (
        <div className="center-msg">Loading slots…</div>
      ) : lots.length === 0 ? (
        <div className="empty">No parking has been set up yet. An admin needs to create one.</div>
      ) : visibleLots.length === 0 ? (
        <div className="empty">No slots match these filters. Try clearing one of them.</div>
      ) : (
        visibleLots.map((l) => (
          <section className="lot" key={l._id}>
            <header className="lot-head">
              <div>
                <h2>{l.name}</h2>
                <p className="lot-place">{l.place}</p>
                {l.description && <p className="muted lot-desc">{l.description}</p>}
              </div>
              <div className="lot-count"><b>{l.vacant}</b> vacant of {l.total}<small>Size {l.size} slots</small></div>
            </header>
            <div className="grid">
              {byLot[l._id].map((s) => <SlotCard key={s._id} slot={s} onBook={setBooking} onRelease={release} />)}
            </div>
          </section>
        ))
      )}

      {booking && (
        <BookModal
          slot={booking}
          onClose={() => setBooking(null)}
          onDone={(msg) => { setBooking(null); show(msg); load(); }}
        />
      )}
    </>
  );
}
