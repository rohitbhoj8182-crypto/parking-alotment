const GROUPS = [
  { key: 'status', label: 'Availability', options: [['', 'All'], ['vacant', 'Vacant'], ['occupied', 'Occupied']] },
  { key: 'type', label: 'Access', options: [['', 'All'], ['public', 'Public'], ['private', 'Private']] },
  { key: 'pricing', label: 'Cost', options: [['', 'All'], ['free', 'Free'], ['paid', 'Paid']] },
  { key: 'vehicleSize', label: 'Slot size', options: [['', 'All'], ['small', 'Small'], ['large', 'Large']] },
];

export default function FilterBar({ filters, onChange, lots }) {
  return (
    <div className="filters">
      <div className="filter-group">
        <span className="filter-label">Parking</span>
        <select aria-label="Parking" className="filter-select" value={filters.lot} onChange={(e) => onChange({ ...filters, lot: e.target.value })}>
          <option value="">All parking lots</option>
          {lots.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
        </select>
      </div>
      {GROUPS.map((g) => (
        <div className="filter-group" key={g.key} role="group" aria-label={g.label}>
          <span className="filter-label">{g.label}</span>
          <div className="seg">
            {g.options.map(([val, text]) => (
              <button key={val} className={filters[g.key] === val ? 'on' : ''} onClick={() => onChange({ ...filters, [g.key]: val })}>
                {text}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
