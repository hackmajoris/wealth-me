import { useState } from 'react';
import { loadEntries, saveEntries, type Entry } from '../lib/storage';
import { fmtSign$, fmtPct } from '../lib/formatters';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const YEARS = Array.from({ length: 8 }, (_, i) => 2019 + i);

interface EntryModalProps {
  onClose: () => void;
  onSave: (entries: Entry[]) => void;
}

export function EntryModal({ onClose, onSave }: EntryModalProps) {
  const [mo, setMo] = useState('Apr');
  const [yr, setYr] = useState('2026');
  const [cInv, setCInv] = useState('');
  const [cRet, setCRet] = useState('');
  const [sInv, setSInv] = useState('');
  const [sRet, setSRet] = useState('');
  const [note, setNote] = useState('');

  const cGain = (parseFloat(cRet) || 0) - (parseFloat(cInv) || 0);
  const sGain = (parseFloat(sRet) || 0) - (parseFloat(sInv) || 0);
  const cRoi = (parseFloat(cInv) || 0) > 0 ? cGain / parseFloat(cInv) * 100 : null;
  const sRoi = (parseFloat(sInv) || 0) > 0 ? sGain / parseFloat(sInv) * 100 : null;

  const handleSave = () => {
    const entry: Entry = {
      id: Date.now(),
      month: `${mo} ${yr.slice(2)}`,
      monthFull: `${mo} ${yr}`,
      yr: parseInt(yr), mo,
      cryptoInvested: parseFloat(cInv) || 0,
      cryptoReturn: parseFloat(cRet) || 0,
      stocksInvested: parseFloat(sInv) || 0,
      stocksReturn: parseFloat(sRet) || 0,
      note,
      createdAt: new Date().toISOString(),
    };
    const all = [...loadEntries(), entry];
    saveEntries(all);
    onSave(all);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Log Monthly Entry</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-section">
            <div className="modal-section-label">Period</div>
            <div className="field-row">
              <div className="field">
                <label>Month</label>
                <select value={mo} onChange={e => setMo(e.target.value)}>
                  {MONTH_NAMES.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Year</label>
                <select value={yr} onChange={e => setYr(e.target.value)}>
                  {YEARS.map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="modal-section">
            <div className="modal-section-label" style={{ color: 'var(--purple)' }}>◎ Crypto</div>
            <div className="field-row">
              <div className="field">
                <label>Cumulative Invested ($)</label>
                <input type="number" placeholder="0" value={cInv} onChange={e => setCInv(e.target.value)} />
              </div>
              <div className="field">
                <label>Current Value ($)</label>
                <input type="number" placeholder="0" value={cRet} onChange={e => setCRet(e.target.value)} />
              </div>
            </div>
            <div className="calc-row">
              <div className="calc-item">
                <div className="calc-label">Gain / Loss</div>
                <div className={`calc-value ${cGain >= 0 ? 'pos' : 'neg'}`}>{fmtSign$(cGain)}</div>
              </div>
              <div className="calc-item">
                <div className="calc-label">ROI %</div>
                <div className={`calc-value ${(cRoi ?? 0) >= 0 ? 'pos' : 'neg'}`}>
                  {cRoi !== null ? fmtPct(cRoi) : '—'}
                </div>
              </div>
            </div>
          </div>

          <div className="modal-section">
            <div className="modal-section-label" style={{ color: 'var(--blue)' }}>↗ Stocks</div>
            <div className="field-row">
              <div className="field">
                <label>Cumulative Invested ($)</label>
                <input type="number" placeholder="0" value={sInv} onChange={e => setSInv(e.target.value)} />
              </div>
              <div className="field">
                <label>Current Value ($)</label>
                <input type="number" placeholder="0" value={sRet} onChange={e => setSRet(e.target.value)} />
              </div>
            </div>
            <div className="calc-row">
              <div className="calc-item">
                <div className="calc-label">Gain / Loss</div>
                <div className={`calc-value ${sGain >= 0 ? 'pos' : 'neg'}`}>{fmtSign$(sGain)}</div>
              </div>
              <div className="calc-item">
                <div className="calc-label">ROI %</div>
                <div className={`calc-value ${(sRoi ?? 0) >= 0 ? 'pos' : 'neg'}`}>
                  {sRoi !== null ? fmtPct(sRoi) : '—'}
                </div>
              </div>
            </div>
          </div>

          <div className="field">
            <label style={{ fontSize: 12, color: 'var(--text2)' }}>Note (optional)</label>
            <input
              type="text"
              placeholder="e.g. Bought MSFT, added to BTC position…"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save Entry</button>
        </div>
      </div>
    </div>
  );
}
