interface YearToggleProps {
  value: 'month' | 'year';
  onChange: (v: 'month' | 'year') => void;
}

export function YearToggle({ value, onChange }: YearToggleProps) {
  return (
    <div className="chart-type-toggle">
      <button
        className={`chart-type-btn ${value === 'month' ? 'active' : ''}`}
        onClick={() => onChange('month')}
        title="Monthly view"
      >M</button>
      <button
        className={`chart-type-btn ${value === 'year' ? 'active' : ''}`}
        onClick={() => onChange('year')}
        title="Yearly view"
      >Y</button>
    </div>
  );
}
