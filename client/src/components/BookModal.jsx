import { useState } from 'react';
import api, { errMsg, money } from '../api.js';

export default function BookModal({ slot, onClose, onDone }) {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleSize, setVehicleSize] = useState('small');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/bookings', { slotId: slot._id, vehicleNumber, vehicleSize, accessCode });
      onDone(`Slot ${slot.code} is yours. Drive in!`);
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={submit}>
        <h2>Park in slot {slot.code}</h2>
        <p className="muted">
          {slot.type === 'public' ? 'Public' : 'Private'} · {slot.vehicleSize === 'small' ? 'Small' : 'Large'} slot ·{' '}
          {slot.pricing === 'free' ? 'Free' : `${money(slot.pricePerHour)} per hour`}
        </p>

        <label>Vehicle number
          <input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="UP85 AB 1234" required autoFocus maxLength={20} />
        </label>

        <div className="field">
          <span>Vehicle size</span>
          <div className="seg wide">
            <button type="button" className={vehicleSize === 'small' ? 'on' : ''} onClick={() => setVehicleSize('small')}>Small car</button>
            <button type="button" className={vehicleSize === 'large' ? 'on' : ''} disabled={slot.vehicleSize === 'small'} onClick={() => setVehicleSize('large')}>
              Large car / SUV
            </button>
          </div>
          {slot.vehicleSize === 'small' && <small className="muted">This slot only fits small cars.</small>}
        </div>

        {slot.type === 'private' && (
          <label>Access code
            <input type="password" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} placeholder="Given by the owner" required />
          </label>
        )}

        {error && <div className="alert">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? 'Booking…' : 'Confirm parking'}</button>
        </div>
      </form>
    </div>
  );
}
