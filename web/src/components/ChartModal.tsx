import { useEffect, type ReactNode } from 'react';

interface ChartModalProps {
  label: string;
  value: string;
  change?: string;
  changePositive?: boolean | null;
  onClose: () => void;
  children: ReactNode;
}

export function ChartModal({ label, value, change, changePositive, onClose, children }: ChartModalProps) {
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
            <button className="modal-close" style={{ width: 36, height: 36, fontSize: 16 }} onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="chart-modal-body">{children}</div>
      </div>
    </div>
  );
}
