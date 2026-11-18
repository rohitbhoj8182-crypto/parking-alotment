import { useCallback, useEffect, useState } from 'react';
import api, { errMsg, money, when } from '../api.js';

export default function MyBookings() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get('/bookings/mine').then((r) => setRows(r.data)).catch((e) => { setError(errMsg(e)); setRows([]); });
  }, []);
  useEffect(load, [load]);

  const release = async (id) => {
    if (!window.confirm('End this parking now?')) return;
    try { await api.patch(`/bookings/${id}/release`); setError(''); } catch (e) { setError(errMsg(e)); }
    load();
  };

  return (
    <>
      <div className="page-head"><div><h1>My bookings</h1><p className="muted">Your most recent parking sessions.</p></div></div>
      {error && <div className="alert">{error}</div>}
      {rows === null ? <div className="center-msg">Loading…</div> : rows.length === 0 ? (
        <div className="empty">You have not parked yet. Head to Find parking and pick a green bay.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Slot</th><th>Vehicle</th><th>Started</th><th>Ended</th><th>Amount</th><th>Status</th><th /></tr></thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b._id}>
                  <td><b>{b.slotCode}</b><div className="muted small">{b.lotName || b.slotType}</div></td>
                  <td>{b.vehicleNumber}</td>
                  <td>{when(b.startTime)}</td>
                  <td>{b.endTime ? when(b.endTime) : '—'}</td>
                  <td>{b.status === 'completed' ? (b.pricing === 'free' ? 'Free' : money(b.amount)) : b.pricing === 'free' ? 'Free' : `${money(b.pricePerHour)}/hr`}</td>
                  <td><span className={`pill ${b.status}`}>{b.status === 'active' ? 'Parked' : 'Completed'}</span></td>
                  <td>{b.status === 'active' && <button className="btn danger sm" onClick={() => release(b._id)}>Release</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
