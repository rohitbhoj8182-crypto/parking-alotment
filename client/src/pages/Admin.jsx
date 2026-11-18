import { useCallback, useEffect, useState } from 'react';
import api, { errMsg, money, when } from '../api.js';

const LOT_EMPTY = { name: '', place: '', description: '', size: '10', prefix: '', type: 'public', pricing: 'free', pricePerHour: '', vehicleSize: 'small', accessCode: '' };
const SLOT_EMPTY = { lot: '', code: '', type: 'public', pricing: 'free', pricePerHour: '', vehicleSize: 'small', accessCode: '' };

const attrsBody = (f) => {
  const b = { type: f.type, pricing: f.pricing, vehicleSize: f.vehicleSize, pricePerHour: f.pricing === 'paid' ? Number(f.pricePerHour) : 0 };
  if (f.type === 'private' && f.accessCode) b.accessCode = f.accessCode;
  return b;
};

// the slot settings shared by "create parking" and "add one slot"
function SlotAttrs({ form, set, codeRequired }) {
  return (
    <>
      <label>Access<select value={form.type} onChange={set('type')}><option value="public">Public</option><option value="private">Private</option></select></label>
      <label>Cost<select value={form.pricing} onChange={set('pricing')}><option value="free">Free</option><option value="paid">Paid</option></select></label>
      {form.pricing === 'paid' && <label>Price per hour (₹)<input type="number" min="1" value={form.pricePerHour} onChange={set('pricePerHour')} required /></label>}
      <label>Slot size<select value={form.vehicleSize} onChange={set('vehicleSize')}><option value="small">Small</option><option value="large">Large</option></select></label>
      {form.type === 'private' && (
        <label>Access code<input value={form.accessCode} onChange={set('accessCode')} placeholder={codeRequired ? 'e.g. 4821' : 'Blank keeps current'} required={codeRequired} /></label>
      )}
    </>
  );
}

export default function Admin() {
  const [lots, setLots] = useState([]);
  const [slots, setSlots] = useState([]);
  const [active, setActive] = useState([]);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [lotForm, setLotForm] = useState(LOT_EMPTY);
  const [editingLot, setEditingLot] = useState(null);
  const [slotForm, setSlotForm] = useState(SLOT_EMPTY);
  const [editingSlot, setEditingSlot] = useState(null);
  const [slotLotFilter, setSlotLotFilter] = useState('');

  const load = useCallback(async () => {
    try {
      const [l, s, a] = await Promise.all([api.get('/lots'), api.get('/slots'), api.get('/bookings/active')]);
      setLots(l.data); setSlots(s.data); setActive(a.data);
    } catch (e) { setMsg({ kind: 'err', text: errMsg(e) }); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const ok = (text) => setMsg({ kind: 'ok', text });
  const bad = (err) => setMsg({ kind: 'err', text: errMsg(err) });
  const setL = (k) => (e) => setLotForm({ ...lotForm, [k]: e.target.value });
  const setS = (k) => (e) => setSlotForm({ ...slotForm, [k]: e.target.value });
  const lotName = (id) => lots.find((l) => l._id === id)?.name || '—';
  const top = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  /* ---------- parking lots ---------- */
  const submitLot = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const core = { name: lotForm.name, place: lotForm.place, description: lotForm.description, size: Number(lotForm.size) };
      if (editingLot) {
        await api.put(`/lots/${editingLot}`, core);
        ok(`${lotForm.name} updated`);
      } else {
        const { data } = await api.post('/lots', { ...core, prefix: lotForm.prefix, ...attrsBody(lotForm) });
        ok(`${data.name} created with ${data.slots} slots (${data.first} to ${data.last})`);
      }
      setLotForm(LOT_EMPTY); setEditingLot(null); load();
    } catch (err) { bad(err); }
    setBusy(false);
  };
  const startEditLot = (l) => {
    setEditingLot(l._id);
    setLotForm({ ...LOT_EMPTY, name: l.name, place: l.place, description: l.description || '', size: String(l.size) });
    top();
  };
  const removeLot = async (l) => {
    if (!window.confirm(`Delete ${l.name} and all its ${l.total} slots?`)) return;
    try { await api.delete(`/lots/${l._id}`); ok(`${l.name} deleted`); if (editingLot === l._id) { setEditingLot(null); setLotForm(LOT_EMPTY); } } catch (err) { bad(err); }
    load();
  };

  /* ---------- single slots ---------- */
  const submitSlot = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (editingSlot) {
        await api.put(`/slots/${editingSlot}`, { code: slotForm.code, ...attrsBody(slotForm) });
        ok(`Slot ${slotForm.code.toUpperCase()} updated`);
      } else {
        await api.post('/slots', { lot: slotForm.lot, code: slotForm.code, ...attrsBody(slotForm) });
        ok(`Slot ${slotForm.code.toUpperCase()} added`);
      }
      setSlotForm({ ...SLOT_EMPTY, lot: slotForm.lot }); setEditingSlot(null); load();
    } catch (err) { bad(err); }
    setBusy(false);
  };
  const startEditSlot = (s) => {
    setEditingSlot(s._id);
    setSlotForm({ ...SLOT_EMPTY, lot: s.lot, code: s.code, type: s.type, pricing: s.pricing, pricePerHour: s.pricing === 'paid' ? String(s.pricePerHour) : '', vehicleSize: s.vehicleSize });
    document.getElementById('slot-form')?.scrollIntoView({ behavior: 'smooth' });
  };
  const removeSlot = async (s) => {
    if (!window.confirm(`Delete slot ${s.code}?`)) return;
    try { await api.delete(`/slots/${s._id}`); ok(`Slot ${s.code} deleted`); } catch (err) { bad(err); }
    load();
  };
  const forceRelease = async (b) => {
    if (!window.confirm(`Release ${b.vehicleNumber} from ${b.slotCode}?`)) return;
    try { await api.patch(`/bookings/${b._id}/release`); ok(`${b.slotCode} released`); } catch (err) { bad(err); }
    load();
  };

  const shownSlots = slotLotFilter ? slots.filter((s) => s.lot === slotLotFilter) : slots;

  return (
    <>
      <div className="page-head"><div><h1>Manage parking</h1><p className="muted">Create parkings, manage their slots, and see who is parked right now.</p></div></div>
      {msg && <div className={`toast ${msg.kind}`} role="status">{msg.text}</div>}

      <form className="panel" onSubmit={submitLot}>
        <div className="panel-head"><h3>{editingLot ? `Edit ${lotForm.name || 'parking'}` : 'Create a parking'}</h3></div>
        <div className="form-row">
          <label className="grow">Parking name<input value={lotForm.name} onChange={setL('name')} placeholder="City Mall Parking" maxLength={80} required /></label>
          <label className="grow">Place<input value={lotForm.place} onChange={setL('place')} placeholder="Station Road, Mathura" maxLength={150} required /></label>
          <label className="narrow">Size (slots)<input type="number" min="1" max={editingLot ? 500 : 200} value={lotForm.size} onChange={setL('size')} required /></label>
        </div>
        <label>Description<textarea value={lotForm.description} onChange={setL('description')} rows={2} maxLength={500} placeholder="Entrances, timings, landmarks, anything drivers should know" /></label>
        {!editingLot && (
          <>
            <p className="muted hint">The slots are created for you using the settings below. You can edit any slot later.</p>
            <div className="form-row">
              <label className="narrow">Slot code prefix<input value={lotForm.prefix} onChange={setL('prefix')} placeholder="A" maxLength={4} pattern="[A-Za-z]{1,4}" title="1 to 4 letters" required /></label>
              <SlotAttrs form={lotForm} set={setL} codeRequired />
            </div>
            {lotForm.prefix && <p className="muted hint">Slots will be named {lotForm.prefix.toUpperCase()}01 to {lotForm.prefix.toUpperCase()}{String(Number(lotForm.size) || 0).padStart(2, '0')}.</p>}
          </>
        )}
        <div className="form-actions">
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : editingLot ? 'Save changes' : 'Create parking'}</button>
          {editingLot && <button type="button" className="btn ghost" onClick={() => { setEditingLot(null); setLotForm(LOT_EMPTY); }}>Cancel</button>}
        </div>
      </form>

      <h3 className="section">Parkings ({lots.length})</h3>
      {lots.length === 0 ? <div className="empty">No parking yet. Create your first one above.</div> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Name</th><th>Place</th><th>Size</th><th>Vacant / total</th><th /></tr></thead>
          <tbody>{lots.map((l) => (
            <tr key={l._id}>
              <td><b>{l.name}</b>{l.description && <div className="muted small clip">{l.description}</div>}</td>
              <td>{l.place}</td><td>{l.size}</td><td>{l.vacant} / {l.total}</td>
              <td className="row-actions">
                <button className="btn ghost sm" onClick={() => startEditLot(l)}>Edit</button>{' '}
                <button className="btn ghost sm" onClick={() => removeLot(l)}>Delete</button>
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      )}

      <h3 className="section">Parked now ({active.length})</h3>
      {active.length === 0 ? <div className="empty">Nobody is parked right now.</div> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Slot</th><th>Vehicle</th><th>Driver</th><th>Since</th><th /></tr></thead>
          <tbody>{active.map((b) => (
            <tr key={b._id}><td><b>{b.slotCode}</b><div className="muted small">{b.lotName}</div></td><td>{b.vehicleNumber}</td><td>{b.user?.name || '—'}</td><td>{when(b.startTime)}</td>
              <td><button className="btn danger sm" onClick={() => forceRelease(b)}>Release</button></td></tr>
          ))}</tbody>
        </table></div>
      )}

      <h3 className="section">Slots</h3>
      <form className="panel" id="slot-form" onSubmit={submitSlot}>
        <div className="panel-head"><h3>{editingSlot ? `Edit slot ${slotForm.code}` : 'Add one slot to a parking'}</h3></div>
        <div className="form-row">
          <label className="grow">Parking
            <select value={slotForm.lot} onChange={setS('lot')} required disabled={!!editingSlot}>
              <option value="">Choose a parking…</option>
              {lots.map((l) => <option key={l._id} value={l._id}>{l.name} ({l.total}/{l.size})</option>)}
            </select>
          </label>
          <label className="narrow">Slot code<input value={slotForm.code} onChange={setS('code')} placeholder="A11" maxLength={12} required /></label>
          <SlotAttrs form={slotForm} set={setS} codeRequired={!editingSlot} />
          <div className="form-actions">
            <button className="btn primary" disabled={busy}>{editingSlot ? 'Save changes' : 'Add slot'}</button>
            {editingSlot && <button type="button" className="btn ghost" onClick={() => { setEditingSlot(null); setSlotForm(SLOT_EMPTY); }}>Cancel</button>}
          </div>
        </div>
      </form>

      <div className="slot-filter">
        <span className="muted">Show slots of</span>
        <select value={slotLotFilter} onChange={(e) => setSlotLotFilter(e.target.value)}>
          <option value="">All parkings</option>
          {lots.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
        </select>
        <span className="muted">({shownSlots.length})</span>
      </div>
      <div className="table-wrap"><table>
        <thead><tr><th>Slot</th><th>Parking</th><th>Access</th><th>Cost</th><th>Size</th><th>Status</th><th /></tr></thead>
        <tbody>{shownSlots.map((s) => (
          <tr key={s._id}><td><b>{s.code}</b></td><td>{lotName(s.lot)}</td><td>{s.type}</td><td>{s.pricing === 'free' ? 'Free' : `${money(s.pricePerHour)}/hr`}</td><td>{s.vehicleSize}</td>
            <td><span className={`pill ${s.status}`}>{s.status === 'vacant' ? 'Vacant' : 'Occupied'}</span></td>
            <td className="row-actions">
              <button className="btn ghost sm" disabled={s.status === 'occupied'} onClick={() => startEditSlot(s)}>Edit</button>{' '}
              <button className="btn ghost sm" disabled={s.status === 'occupied'} onClick={() => removeSlot(s)}>Delete</button>
            </td></tr>
        ))}</tbody>
      </table></div>
    </>
  );
}
