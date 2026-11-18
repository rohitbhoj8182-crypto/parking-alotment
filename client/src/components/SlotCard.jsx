import { money } from '../api.js';

export default function SlotCard({ slot, onBook, onRelease }) {
  const vacant = slot.status === 'vacant';
  const label = vacant ? 'Vacant' : slot.isMine ? 'Your car' : 'Occupied';
  const clickable = vacant || slot.isMine;
  const handle = () => (vacant ? onBook(slot) : slot.isMine && onRelease(slot));

  return (
    <button
      className={`slot ${slot.status} ${slot.isMine ? 'mine' : ''}`}
      disabled={!clickable}
      onClick={handle}
      aria-label={`Slot ${slot.code}, ${label}`}
    >
      <span className="slot-code">{slot.code}</span>
      <span className="slot-state">{label}</span>
      <span className="slot-meta">
        <span className="tag">{slot.type === 'public' ? 'Public' : 'Private'}</span>
        <span className="tag">{slot.vehicleSize === 'small' ? 'Small' : 'Large'}</span>
      </span>
      <span className="slot-price">{slot.pricing === 'free' ? 'Free' : `${money(slot.pricePerHour)}/hr`}</span>
      <span className="slot-action">{vacant ? 'Park here' : slot.isMine ? 'Release' : ''}</span>
    </button>
  );
}
