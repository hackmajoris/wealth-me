import { useState } from 'react';
import { api } from '../lib/api';
import { fmtSign$, fmtPct } from '../lib/formatters';
import type { Entry } from '../lib/storage';

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
// 2010 through next year, so the current year is always selectable.
const YEARS = Array.from({ length: new Date().getFullYear() - 2010 + 2 }, (_, i) => 2010 + i);

interface EntryModalProps {
  entry?: Entry;
  onClose: () => void;
  onSave: () => void;
  type?: 'crypto' | 'stocks' | 'both';
  restrictMonths?: { month: string; year: number }[];
}

export function EntryModal({
  entry,
  onClose,
  onSave,
  type = 'both',
  restrictMonths,
}: EntryModalProps) {
  const [mo, setMo] = useState(entry?.mo ?? new Date().toLocaleString('en-US', { month: 'short' }));
  const [yr, setYr] = useState(String(entry?.yr ?? new Date().getFullYear()));
  const [cInv, setCInv] = useState(entry ? String(entry.cryptoInvested) : '');
  const [cRet, setCRet] = useState(entry ? String(entry.cryptoReturn) : '');
  const [sInv, setSInv] = useState(entry ? String(entry.stocksInvested) : '');
  const [sRet, setSRet] = useState(entry ? String(entry.stocksReturn) : '');
  const [note, setNote] = useState(entry?.note ?? '');

  // Determine available years when months are restricted
  const yearOptions =
    restrictMonths && restrictMonths.length > 0
      ? [...new Set(restrictMonths.map((m) => m.year))]
      : YEARS;

  const cGain = (parseFloat(cRet) || 0) - (parseFloat(cInv) || 0);
  const sGain = (parseFloat(sRet) || 0) - (parseFloat(sInv) || 0);
  const cRoi = (parseFloat(cInv) || 0) > 0 ? (cGain / parseFloat(cInv)) * 100 : null;
  const sRoi = (parseFloat(sInv) || 0) > 0 ? (sGain / parseFloat(sInv)) * 100 : null;

  const handleSave = () => {
    // When editing a specific type, preserve the other asset class data
    const body: any = {
      month: `${mo} ${yr.slice(2)}`,
      monthFull: `${mo} ${yr}`,
      yr: parseInt(yr),
      mo,
      note,
    };

    if (type === 'crypto' && entry) {
      // Crypto-only edit: preserve stocks data from original entry
      body.cryptoInvested = parseFloat(cInv) || 0;
      body.cryptoReturn = parseFloat(cRet) || 0;
      body.stocksInvested = entry.stocksInvested;
      body.stocksReturn = entry.stocksReturn;
    } else if (type === 'stocks' && entry) {
      // Stocks-only edit: preserve crypto data from original entry
      body.cryptoInvested = entry.cryptoInvested;
      body.cryptoReturn = entry.cryptoReturn;
      body.stocksInvested = parseFloat(sInv) || 0;
      body.stocksReturn = parseFloat(sRet) || 0;
    } else {
      // Full edit (create or both)
      body.cryptoInvested = parseFloat(cInv) || 0;
      body.cryptoReturn = parseFloat(cRet) || 0;
      body.stocksInvested = parseFloat(sInv) || 0;
      body.stocksReturn = parseFloat(sRet) || 0;
    }

    const op = entry ? api.entries.update(entry.id, body) : api.entries.create(body);
    op.then(() => {
      onSave();
      onClose();
    }).catch(console.error);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">
            {entry ? 'Edit Entry' : 'Log Monthly Entry'}
            {type !== 'both' && (
              <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, color: 'var(--text3)' }}>
                ({type === 'crypto' ? 'Crypto' : 'Stocks'})
              </span>
            )}
          </div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          {entry ? (
            <div className="modal-section">
              <div className="modal-section-label">Period</div>
              <div style={{ padding: '12px 0', color: 'var(--text2)', fontSize: 14 }}>
                {mo} {yr}
              </div>
            </div>
          ) : (
            <div className="modal-section">
              <div className="modal-section-label">Period</div>
              <div className="field-row">
                <div className="field">
                  <label>Month</label>
                  <select value={mo} onChange={(e) => setMo(e.target.value)}>
                    {restrictMonths && restrictMonths.length > 0
                      ? restrictMonths.map((m) => <option key={m.month}>{m.month}</option>)
                      : MONTH_NAMES.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Year</label>
                  <select value={yr} onChange={(e) => setYr(e.target.value)}>
                    {restrictMonths && restrictMonths.length > 0
                      ? yearOptions.map((y) => <option key={y}>{y}</option>)
                      : YEARS.map((y) => <option key={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {(type === 'crypto' || type === 'both') && (
            <div className="modal-section">
              <div className="modal-section-label" style={{ color: 'var(--purple)' }}>
                ◎ Crypto
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Cumulative Invested ($)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={cInv}
                    onChange={(e) => setCInv(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Current Value ($)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={cRet}
                    onChange={(e) => setCRet(e.target.value)}
                  />
                </div>
              </div>
              <div className="calc-row">
                <div className="calc-item">
                  <div className="calc-label">Gain / Loss</div>
                  <div className={`calc-value ${cGain >= 0 ? 'pos' : 'neg'}`}>
                    {fmtSign$(cGain)}
                  </div>
                </div>
                <div className="calc-item">
                  <div className="calc-label">ROI %</div>
                  <div className={`calc-value ${(cRoi ?? 0) >= 0 ? 'pos' : 'neg'}`}>
                    {cRoi !== null ? fmtPct(cRoi) : '—'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {(type === 'stocks' || type === 'both') && (
            <div className="modal-section">
              <div className="modal-section-label" style={{ color: 'var(--blue)' }}>
                ↗ Stocks
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Cumulative Invested ($)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={sInv}
                    onChange={(e) => setSInv(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Current Value ($)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={sRet}
                    onChange={(e) => setSRet(e.target.value)}
                  />
                </div>
              </div>
              <div className="calc-row">
                <div className="calc-item">
                  <div className="calc-label">Gain / Loss</div>
                  <div className={`calc-value ${sGain >= 0 ? 'pos' : 'neg'}`}>
                    {fmtSign$(sGain)}
                  </div>
                </div>
                <div className="calc-item">
                  <div className="calc-label">ROI %</div>
                  <div className={`calc-value ${(sRoi ?? 0) >= 0 ? 'pos' : 'neg'}`}>
                    {sRoi !== null ? fmtPct(sRoi) : '—'}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="field">
            <label style={{ fontSize: 12, color: 'var(--text2)' }}>Note (optional)</label>
            <input
              type="text"
              placeholder="e.g. Bought MSFT, added to BTC position…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave}>
            {entry ? 'Save Changes' : 'Save Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}
