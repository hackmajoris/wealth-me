import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { AssetEntry, AssetHistoryPoint } from '../lib/api';
import { fmtCompact } from '../lib/formatters';
import { polyTrend } from '../lib/trendUtils';
import { MultiLineChart } from '../components/charts/MultiLineChart';
import { useChart } from '../components/charts/useChart';
import { ChartCard } from '../components/ChartCard';
import { C, chartDefaults } from '../lib/chartDefaults';
import type { TooltipItem } from 'chart.js';

const CATEGORIES = ['Real Estate', 'Vehicle', 'Cash / Savings', 'Investment', 'Personal', 'Other'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MO_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const now = new Date();

const btnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 13, padding: '2px 5px', borderRadius: 4, lineHeight: 1,
};

// ── Asset Bar Chart ──────────────────────────────────────────────────────────

function AssetBarChart({ labels, data, trend }: { labels: string[]; data: number[]; trend: number[] }) {
  const ref = useChart({
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          type: 'bar' as const,
          label: 'Total Value',
          data,
          backgroundColor: C.blue + 'aa',
          borderColor: C.blue,
          borderWidth: 1,
          borderRadius: 4,
          order: 2,
        },
        {
          type: 'line' as const,
          label: 'Trend',
          data: trend,
          borderColor: C.yellow,
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: C.yellow,
          tension: 0.4,
          order: 1,
        },
      ],
    },
    options: {
      ...chartDefaults,
      interaction: { mode: 'index' as const, intersect: false },
      plugins: {
        ...chartDefaults.plugins,
        legend: {
          display: true,
          position: 'top' as const,
          labels: {
            color: 'rgba(238,238,248,0.55)',
            font: { size: 11, family: 'Outfit' },
            boxWidth: 20,
            pointStyle: 'line' as const,
            usePointStyle: true,
          },
        },
        tooltip: {
          ...(chartDefaults.plugins as Record<string, unknown>)['tooltip'] as object,
          mode: 'index' as const,
          intersect: false,
          callbacks: {
            label: (ctx: TooltipItem<'bar'>) => {
              const v = ctx.parsed.y ?? 0;
              return `${ctx.dataset.label}: ${Math.round(v).toLocaleString()}`;
            },
          },
        },
      },
      scales: {
        x: {
          ...chartDefaults.scales?.['x'],
          ticks: {
            ...(chartDefaults.scales?.['x'] as Record<string, unknown>)?.['ticks'] as object,
            maxRotation: 44,
            minRotation: 44,
            maxTicksLimit: 100,
          },
        },
        y: {
          ...chartDefaults.scales?.['y'],
          ticks: {
            ...(chartDefaults.scales?.['y'] as Record<string, unknown>)?.['ticks'] as object,
            callback: (v: number | string) => {
              const n = Number(v);
              return n >= 1000 ? (n / 1000).toFixed(0) + 'k' : n;
            },
          },
        },
      },
    } as never,
  });

  return <canvas ref={ref} />;
}

// ── Entry Modal ───────────────────────────────────────────────────────────────

interface EntryModalProps {
  entry?: AssetEntry | null;
  currency: string;
  defaultDate?: string;
  onClose: () => void;
  onSave: () => void;
}

function EntryModal({ entry, currency, defaultDate, onClose, onSave }: EntryModalProps) {
  const isEditing = !!entry && entry.id > 0;

  const parseDate = (dateStr: string) => {
    const parts = dateStr.split(' ');
    const mo = MO_SHORT.indexOf(parts[0]);
    return { mo: mo >= 0 ? mo : now.getMonth(), yr: parseInt(parts[1]) || now.getFullYear() };
  };

  const def = entry
    ? parseDate(entry.date)
    : defaultDate
    ? parseDate(defaultDate)
    : { mo: now.getMonth(), yr: now.getFullYear() };

  const [name, setName] = useState(entry?.name ?? '');
  const [category, setCategory] = useState(entry?.category ?? 'Real Estate');
  const [amount, setAmount] = useState(entry?.amount ? String(entry.amount) : '');
  const [note, setNote] = useState(entry?.note ?? '');
  const [month, setMonth] = useState(def.mo);
  const [year, setYear] = useState(def.yr);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { alert('Name is required'); return; }
    const amountN = parseFloat(amount) || 0;
    if (amountN <= 0) { alert('Amount must be greater than 0'); return; }
    setSaving(true);
    const body = {
      date: `${MO_SHORT[month]} ${year}`,
      name: name.trim(),
      category,
      amount: amountN,
      note,
    };
    try {
      if (isEditing) {
        await api.assetEntries.update(entry!.id, body);
      } else {
        await api.assetEntries.create(body);
      }
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      alert(`Failed to ${isEditing ? 'update' : 'save'} entry`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={ev => ev.target === ev.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{isEditing ? 'Edit' : 'Add'} Asset Entry</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-section">
            <div className="modal-section-label" style={{ color: 'var(--text2)' }}>Month</div>
            <div className="field-row">
              <div className="field" style={{ flex: 2 }}>
                <label>Month</label>
                <select value={month} onChange={e => setMonth(Number(e.target.value))}>
                  {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>Year</label>
                <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} min={2000} max={2100} />
              </div>
            </div>
          </div>
          <div className="modal-section">
            <div className="field-row">
              <div className="field" style={{ flex: 2 }}>
                <label>Name</label>
                <input type="text" placeholder="e.g. Primary House" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>Type</label>
                <select value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Amount ({currency})</label>
                <input type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
              <div className="field">
                <label>Note (optional)</label>
                <input type="text" placeholder="" value={note} onChange={e => setNote(e.target.value)} />
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEditing ? 'Update Entry' : 'Add Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

type ModalState = false | { type: 'create'; defaultDate?: string } | { type: 'edit'; entry: AssetEntry };

export function Assets() {
  const [entries, setEntries] = useState<AssetEntry[]>([]);
  const [history, setHistory] = useState<AssetHistoryPoint[]>([]);
  const [currency, setCurrency] = useState('RON');
  const [modal, setModal] = useState<ModalState>(false);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  const refresh = () => {
    api.assetEntries.list().then(setEntries).catch(console.error);
    api.assets.history().then(setHistory).catch(console.error);
  };

  useEffect(() => {
    refresh();
    api.settings.getAssetsCurrency().then(s => setCurrency(s.value)).catch(console.error);
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this entry?')) return;
    await api.assetEntries.remove(id).catch(console.error);
    refresh();
  };

  const grouped = entries.reduce<Record<string, AssetEntry[]>>((acc, e) => {
    if (!acc[e.date]) acc[e.date] = [];
    acc[e.date].push(e);
    return acc;
  }, {});
  const dates = Object.keys(grouped);

  const latestTotal = history.length > 0 ? history[history.length - 1].totalValue : 0;
  const latestDate = history.length > 0 ? history[history.length - 1].date : '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {modal !== false && (
        <EntryModal
          entry={modal.type === 'edit' ? modal.entry : null}
          currency={currency}
          defaultDate={modal.type === 'create' ? modal.defaultDate : undefined}
          onClose={() => setModal(false)}
          onSave={refresh}
        />
      )}

      <div className="page-header">
        <div>
          <div className="page-title">Assets</div>
          <div className="page-sub">Track what you own · {dates.length} month{dates.length !== 1 ? 's' : ''} tracked</div>
        </div>
        <button className="add-btn" onClick={() => setModal({ type: 'create' })}>+ Add Entry</button>
      </div>

      {/* KPI */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Latest Total Value</div>
          <div className="kpi-value pos">{fmtCompact(currency, latestTotal)}</div>
          <div className="kpi-change neu">{latestDate}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Months Tracked</div>
          <div className="kpi-value">{dates.length}</div>
          <div className="kpi-change neu">Historical data points</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Entries</div>
          <div className="kpi-value">{entries.length}</div>
          <div className="kpi-change neu">Across all months</div>
        </div>
      </div>

      {/* History chart */}
      {history.length > 0 && (
        <ChartCard
          label="Total Value · Historical"
          value={fmtCompact(currency, latestTotal)}
          typeToggle={{
            value: chartType,
            onChange: (v) => setChartType(v as 'line' | 'bar'),
            options: [
              { value: 'line', label: 'Line' },
              { value: 'bar', label: 'Bar' },
            ],
          }}
          modalContent={
            chartType === 'line' ? (
              <MultiLineChart
                labels={history.map(p => p.date)}
                datasets={[
                  { label: 'Total Value', data: history.map(p => p.totalValue), color: C.blue },
                  { label: 'Trend', data: polyTrend(history.map(p => p.totalValue), 2), color: C.yellow },
                ]}
                valueFormat="number"
              />
            ) : (
              <AssetBarChart
                labels={history.map(p => p.date)}
                data={history.map(p => p.totalValue)}
                trend={polyTrend(history.map(p => p.totalValue), 2)}
              />
            )
          }
        >
          {chartType === 'line' ? (
            <MultiLineChart
              labels={history.map(p => p.date)}
              datasets={[
                { label: 'Total Value', data: history.map(p => p.totalValue), color: C.blue },
                { label: 'Trend', data: polyTrend(history.map(p => p.totalValue), 2), color: C.yellow },
              ]}
              valueFormat="number"
            />
          ) : (
            <AssetBarChart
              labels={history.map(p => p.date)}
              data={history.map(p => p.totalValue)}
              trend={polyTrend(history.map(p => p.totalValue), 2)}
            />
          )}
        </ChartCard>
      )}

      {/* Monthly groups */}
      {dates.length === 0 ? (
        <div style={{ color: 'var(--text3)', textAlign: 'center', padding: '60px 0', fontSize: 14 }}>
          No entries yet. Import historical data in Settings or add an entry above.
        </div>
      ) : (
        <div className="data-table-wrap">
        <div className="table-scroll" style={{ maxHeight: 520 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {dates.map(date => {
            const group = grouped[date];
            const total = group.reduce((s, e) => s + e.amount, 0);
            return (
              <div key={date}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{date}</span>
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>{group.length} entr{group.length !== 1 ? 'ies' : 'y'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue)' }}>{fmtCompact(currency, total)}</span>
                    <button
                      style={{ ...btnStyle, fontSize: 12, color: 'var(--text2)', border: '1px solid var(--border)', padding: '3px 8px' }}
                      onClick={() => setModal({ type: 'create', defaultDate: date })}
                    >
                      + Add
                    </button>
                  </div>
                </div>
                <table className="data-table" style={{ margin: 0 }}>
                  <tbody>
                    {group.map(e => (
                      <tr key={e.id}>
                        <td style={{ fontWeight: 500 }}>{e.name}</td>
                        <td style={{ color: 'var(--text2)', fontSize: 12 }}>{e.category}</td>
                        <td className="pos" style={{ fontWeight: 500, textAlign: 'right' }}>
                          {fmtCompact(currency, e.amount)}
                        </td>
                        <td style={{ color: 'var(--text3)', fontSize: 12 }}>{e.note || '—'}</td>
                        <td>
                          <button style={{ ...btnStyle, color: 'var(--text2)' }} onClick={() => setModal({ type: 'edit', entry: e })}>✎</button>
                          <button style={{ ...btnStyle, color: 'var(--red)' }} onClick={() => handleDelete(e.id)}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
        </div>
        </div>
      )}
    </div>
  );
}
