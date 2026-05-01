import { useState, type ReactNode } from 'react';
import { ChartModal } from './ChartModal';

interface TypeToggle {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}

interface ChartCardProps {
  label: string;
  value: string;
  change?: string;
  changePositive?: boolean | null;
  children: ReactNode;
  modalContent?: ReactNode;
  typeToggle?: TypeToggle;
  noExpand?: boolean;
  extraControls?: ReactNode;
}

export function ChartCard({
  label, value, change, changePositive,
  children, modalContent, typeToggle, noExpand, extraControls,
}: ChartCardProps) {
  const [open, setOpen] = useState(false);
  const expandable = !noExpand;

  return (
    <>
      <div className="chart-card" onClick={() => expandable && !typeToggle && setOpen(true)}>
        <div className="chart-card-header" onClick={() => expandable && setOpen(true)}>
          <span className="chart-card-label">{label}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {extraControls && (
              <div onClick={e => e.stopPropagation()}>{extraControls}</div>
            )}
            {typeToggle && (
              <div className="chart-type-toggle" onClick={e => e.stopPropagation()}>
                {typeToggle.options.map(o => (
                  <button
                    key={o.value}
                    className={`chart-type-btn ${typeToggle.value === o.value ? 'active' : ''}`}
                    onClick={e => { e.stopPropagation(); typeToggle.onChange(o.value); }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
            {expandable && <span className="chart-card-expand">↗</span>}
          </div>
        </div>
        <div className={`chart-card-value ${changePositive === null || changePositive === undefined ? '' : changePositive ? 'pos' : 'neg'}`}>
          {value}
        </div>
        {change && (
          <div className={`chart-card-change ${changePositive ? 'pos' : 'neg'}`}>{change}</div>
        )}
        <div className="chart-canvas-wrap">{children}</div>
      </div>

      {open && (
        <ChartModal
          label={label} value={value} change={change} changePositive={changePositive}
          onClose={() => setOpen(false)}
          typeToggle={typeToggle}
          extraControls={extraControls}
        >
          {modalContent ?? children}
        </ChartModal>
      )}
    </>
  );
}
