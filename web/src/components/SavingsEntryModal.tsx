import { useState } from 'react';
import { api } from '../lib/api';
import type { SavingsEntry } from '../lib/storage';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const YEARS = Array.from({ length: 8 }, (_, i) => 2019 + i);

interface SavingsEntryModalProps {
  entry?: SavingsEntry | null;
  onClose: () => void;
  onSave: () => void;
  globalTarget?: number;
}

export function SavingsEntryModal({ entry, onClose, onSave, globalTarget = 30 }: SavingsEntryModalProps) {
  const editing = !!entry && entry.id > 0;
  const [mo,  setMo]  = useState(entry?.mo  ?? 'Apr');
  const [yr,  setYr]  = useState(entry?.yr   ? String(entry.yr)           : '2026');
  const [inc, setInc] = useState(entry?.netIncome     ? String(entry.netIncome)     : '');
  const [exp, setExp] = useState(entry?.totalExpenses ? String(entry.totalExpenses) : '');
  const [note, setNote] = useState(entry?.note ?? '');
  const [saving, setSaving] = useState(false);

  const incV = parseFloat(inc) || 0;
  const expV = parseFloat(exp) || 0;
  const savV = incV - expV;
  const rate = incV > 0 ? Math.round((savV / incV * 100) * 10) / 10 : 0;
  const vsTarget = Math.round((rate - globalTarget) * 10) / 10;

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        month: `${mo} ${String(yr).slice(2)}`,
        monthFull: `${mo} ${yr}`,
        yr: parseInt(yr), mo,
        netIncome: incV, totalExpenses: expV,
        savings: savV, savingRate: rate,
        target: 0,
        note,
      };

      if (editing) {
        await api.savings.update(entry.id, data);
      } else {
        await api.savings.create(data);
      }

      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={ev => ev.target === ev.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{editing ? 'Edit' : 'Log'} Savings Entry</div>
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
            <div className="modal-section-label" style={{ color: 'var(--blue)' }}>Income & Expenses</div>
            <div className="field-row">
              <div className="field">
                <label>Net Income (lei)</label>
                <input type="number" placeholder="0" value={inc} onChange={e => setInc(e.target.value)} />
              </div>
              <div className="field">
                <label>Total Expenses (lei)</label>
                <input type="number" placeholder="0" value={exp} onChange={e => setExp(e.target.value)} />
              </div>
            </div>
            <div className="calc-row">
              <div className="calc-item">
                <div className="calc-label">Saved</div>
                <div className={`calc-value ${savV >= 0 ? 'pos' : 'neg'}`}>
                  {savV >= 0 ? '' : '-'}{Math.abs(Math.round(savV)).toLocaleString()} lei
                </div>
              </div>
              <div className="calc-item">
                <div className="calc-label">Saving Rate</div>
                <div className={`calc-value ${rate >= 0 ? 'pos' : 'neg'}`}>{rate.toFixed(1)}%</div>
              </div>
              <div className="calc-item">
                <div className="calc-label">vs Target</div>
                <div className={`calc-value ${vsTarget >= 0 ? 'pos' : 'neg'}`}>
                  {vsTarget >= 0 ? '+' : ''}{vsTarget}%
                </div>
              </div>
            </div>
          </div>

          <div className="field">
            <label style={{ fontSize: 12, color: 'var(--text2)' }}>Note (optional)</label>
            <input
              type="text"
              placeholder="e.g. High expenses due to vacation…"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Update' : 'Save'} Entry</button>
        </div>
      </div>
    </div>
  );
}
