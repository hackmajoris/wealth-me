import { useEffect, type ReactNode } from 'react';

interface TypeToggle {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}

interface ChartModalProps {
  label: string;
  value: string;
  change?: string;
  changePositive?: boolean | null;
  onClose: () => void;
  children: ReactNode;
  typeToggle?: TypeToggle;
  extraControls?: ReactNode;
}

export function ChartModal({ label, value, change, changePositive, onClose, children, typeToggle, extraControls }: ChartModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="chart-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="chart-modal">
        <div className="chart-modal-header">
          <div className="chart-modal-meta">
            <div className="chart-modal-label">{label}</div>
            <div className={`chart-modal-value ${changePositive === null || changePositive === undefined ? '' : changePositive ? 'pos' : 'neg'}`}>
              {value}
            </div>
            {change && (
              <div className={`chart-modal-change ${changePositive ? 'pos' : 'neg'}`}>{change}</div>
            )}
          </div>
          <div className="chart-modal-actions">
            {extraControls && (
              <div style={{ marginRight: 8 }}>{extraControls}</div>
            )}
            {typeToggle && (
              <div className="chart-type-toggle" style={{ marginRight: 8 }}>
                {typeToggle.options.map(o => (
                  <button
                    key={o.value}
                    className={`chart-type-btn ${typeToggle.value === o.value ? 'active' : ''}`}
                    onClick={() => typeToggle.onChange(o.value)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
            <button className="modal-close" style={{ width: 36, height: 36, fontSize: 16 }} onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="chart-modal-body">{children}</div>
      </div>
    </div>
  );
}
