import { RANGES, type Range } from '../lib/ranges';

interface TimeRangeProps {
  value: Range;
  onChange: (r: Range) => void;
  showEvents?: boolean;
  onToggleEvents?: () => void;
}

export function TimeRange({ value, onChange, showEvents, onToggleEvents }: TimeRangeProps) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <div className="time-range">
        {RANGES.map((r) => (
          <button
            key={r}
            className={`tr-btn ${value === r ? 'active' : ''}`}
            onClick={() => onChange(r)}
          >
            {r}
          </button>
        ))}
      </div>
      {onToggleEvents && (
        <button className={`events-btn ${showEvents ? 'active' : ''}`} onClick={onToggleEvents}>
          <span className="events-dot" />
          Events
        </button>
      )}
    </div>
  );
}
