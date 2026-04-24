import { useState } from 'react';
import { WealthData as D } from '../data/wealthData';
import { YoYBarChart } from '../components/charts/YoYBarChart';
import { C } from '../lib/chartDefaults';

const annualRows = [
  { key: 'portfolioRoi',   label: 'Portfolio ROI',   fmt: (v: number | null) => v !== null ? (v>=0?'+':'')+v+'%' : '—', type: 'pct' },
  { key: 'yoyChange',      label: 'YoY Δ',            fmt: (v: number | null) => v !== null ? (v>=0?'+':'')+v+'%' : '—', type: 'pct' },
  { key: 'cryptoRoi',      label: 'Crypto ROI',       fmt: (v: number | null) => v !== null ? (v>=0?'+':'')+v+'%' : '—', type: 'pct' },
  { key: 'stocksRoi',      label: 'Stocks ROI',       fmt: (v: number | null) => v !== null ? (v>=0?'+':'')+v+'%' : '—', type: 'pct' },
  { key: 'spxRoi',         label: 'S&P 500',          fmt: (v: number | null) => v !== null ? (v>=0?'+':'')+v+'%' : '—', type: 'pct' },
  { key: 'nasdaqRoi',      label: 'Nasdaq',           fmt: (v: number | null) => v !== null ? (v>=0?'+':'')+v+'%' : '—', type: 'pct' },
  { key: 'newInvested',    label: 'New Invested',     fmt: (v: number | null) => v != null && v > 0 ? '$'+v.toLocaleString() : '$0', type: 'neu' },
  { key: 'monthlyAvg',     label: 'Monthly Avg',      fmt: (v: number | null) => v != null && v > 0 ? '$'+v.toLocaleString() : '$0', type: 'neu' },
  { key: 'portfolioValue', label: 'Portfolio Value',  fmt: (v: number | null) => v != null ? '$'+(v/1000).toFixed(1)+'k' : '—', type: 'pos' },
  { key: 'gain',           label: 'Total Gain',       fmt: (v: number | null) => v != null ? (v>=0?'+$':'-$')+Math.abs(Math.round(v)).toLocaleString() : '—', type: 'pct' },
] as const;

function heatColor(val: number | null, type: string): string {
  if (type === 'neu' || type === 'pos' || val === null) return 'transparent';
  if (val > 100)  return 'rgba(52,211,153,0.25)';
  if (val > 50)   return 'rgba(52,211,153,0.18)';
  if (val > 20)   return 'rgba(52,211,153,0.12)';
  if (val > 0)    return 'rgba(52,211,153,0.07)';
  if (val > -20)  return 'rgba(248,113,113,0.08)';
  if (val > -50)  return 'rgba(248,113,113,0.15)';
  return 'rgba(248,113,113,0.25)';
}

export function Annual() {
  const stats = D.annualStats;
  const [focusYear, setFocusYear] = useState<number | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-header">
        <div>
          <div className="page-title">Annual Statistics</div>
          <div className="page-sub">Year-over-year breakdown · 2019 – 2026</div>
        </div>
      </div>

      {/* Year summary cards */}
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
        {stats.map(s => {
          const isFocus = focusYear === s.year;
          const partial = s.months < 12;
          return (
            <div
              key={s.year}
              onClick={() => setFocusYear(isFocus ? null : s.year)}
              style={{
                flexShrink: 0, width: 130,
                background: isFocus ? 'var(--surface2)' : 'var(--surface)',
                border: `1px solid ${isFocus ? 'var(--purple)' : 'var(--border)'}`,
                borderRadius: 14, padding: '14px 16px', cursor: 'pointer',
                transition: 'border-color .15s',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
                {s.year}{partial ? ' *' : ''}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'JetBrains Mono', color: s.portfolioRoi >= 0 ? C.green : C.red }}>
                {s.portfolioRoi >= 0 ? '+' : ''}{s.portfolioRoi}%
              </div>
              {s.yoyChange !== null && (
                <div style={{ fontSize: 11, marginTop: 4, color: s.yoyChange >= 0 ? C.green : C.red, fontWeight: 500 }}>
                  {s.yoyChange >= 0 ? '▲' : '▼'} {Math.abs(s.yoyChange)}% YoY
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                ${(s.portfolioValue / 1000).toFixed(0)}k value
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: -16 }}>* Partial year</div>

      {/* Heatmap table */}
      <div>
        <div className="section-row" style={{ marginBottom: 10 }}>
          <div className="section-title">Heatmap — key metrics by year</div>
        </div>
        <div className="data-table-wrap" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ minWidth: 700 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', width: 160 }}>Metric</th>
                {stats.map(s => (
                  <th key={s.year} style={{
                    background: focusYear === s.year ? 'rgba(167,139,250,0.12)' : '',
                    color: focusYear === s.year ? 'var(--purple)' : '',
                  }}>
                    {s.year}{s.months < 12 ? '*' : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {annualRows.map(row => (
                <tr key={row.key}>
                  <td style={{ color: 'var(--text2)', fontFamily: 'Outfit', fontSize: 13, fontWeight: 500 }}>{row.label}</td>
                  {stats.map(s => {
                    const val = s[row.key] as number | null;
                    const bg  = heatColor(val, row.type);
                    const col = row.type === 'pct'
                      ? (val === null ? 'var(--text3)' : val >= 0 ? C.green : C.red)
                      : row.type === 'pos' ? C.green : 'var(--text2)';
                    return (
                      <td key={s.year} style={{
                        background: focusYear === s.year ? 'rgba(167,139,250,0.06)' : bg,
                        color: col, fontWeight: 600, fontSize: 12,
                        transition: 'background .15s',
                      }}>
                        {row.fmt(val)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* YoY bar chart */}
      <div>
        <div className="section-row" style={{ marginBottom: 10 }}>
          <div className="section-title">Year-over-year ROI comparison</div>
        </div>
        <div className="data-table-wrap" style={{ padding: 20 }}>
          <div className="chart-canvas-wrap" style={{ height: 280 }}>
            <YoYBarChart stats={stats} />
          </div>
        </div>
      </div>
    </div>
  );
}
