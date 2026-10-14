import { useState } from 'react';
import { futureValue } from '../lib/compound';
import { fmt$ } from '../lib/formatters';
import { ChartCard } from './ChartCard';
import { MultiLineChart } from './charts/MultiLineChart';
import { C } from '../lib/chartDefaults';

interface CompoundGrowthProps {
  /** Current portfolio value (USD). */
  currentValue: number;
  /** Net amount invested over the last 12 months (USD). */
  lastYearInvested: number;
  /** Latest data month, e.g. "Oct 26"; projections are dated from it. */
  baseMonth: string | null;
}

const DEFAULT_RATE = 10;
const DEFAULT_YEARS = 10;
const MAX_YEARS = 50;

export function CompoundGrowth({ currentValue, lastYearInvested, baseMonth }: CompoundGrowthProps) {
  // User overrides; null means "use the value derived from data".
  const [pv, setPv] = useState<string | null>(null);
  const [pmt, setPmt] = useState<string | null>(null);
  const [ratePct, setRatePct] = useState(String(DEFAULT_RATE));
  const [yearsStr, setYearsStr] = useState(String(DEFAULT_YEARS));

  const num = (v: string | null, fallback: number) => {
    const n = v === null || v.trim() === '' ? NaN : Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const defaultPv = Math.round(currentValue);
  const defaultPmt = Math.round(Math.max(0, lastYearInvested));
  const PV = num(pv, defaultPv);
  const PMT = num(pmt, defaultPmt);
  const i = num(ratePct, DEFAULT_RATE) / 100;
  const n = Math.min(MAX_YEARS, Math.max(1, Math.round(num(yearsStr, DEFAULT_YEARS))));

  const [baseMo, baseYr] = baseMonth ? baseMonth.split(' ') : [null, null];
  const baseYear = baseYr ? 2000 + Number(baseYr) : new Date().getFullYear();
  const rows = Array.from({ length: n }, (_, k) => {
    const year = k + 1;
    const value = futureValue(PV, PMT, i, year);
    const contributed = PV + PMT * year;
    return {
      year,
      date: `${baseMo ?? ''} ${baseYear + year}`.trim(),
      value,
      contributed,
      growth: value - contributed,
    };
  });
  const last = rows[rows.length - 1];
  const edited =
    pv !== null ||
    pmt !== null ||
    ratePct !== String(DEFAULT_RATE) ||
    yearsStr !== String(DEFAULT_YEARS);

  const field = (
    label: string,
    value: string | null,
    fallback: number,
    set: (v: string) => void
  ) => (
    <div className="field">
      <label>{label}</label>
      <input
        type="number"
        value={value ?? String(fallback)}
        onChange={(e) => set(e.target.value)}
      />
    </div>
  );

  const chart = (
    <MultiLineChart
      labels={rows.map((r) => r.date)}
      valueFormat="number"
      chartType="bar"
      datasets={[
        { label: 'Contributed', data: rows.map((r) => r.contributed), color: C.blue },
        { label: 'Value', data: rows.map((r) => r.value), color: C.green },
      ]}
    />
  );

  return (
    <div className="chart-grid">
      <div className="chart-card" style={{ cursor: 'default' }}>
        <div className="chart-card-header">
          <span className="chart-card-label">Compound Growth Calculator</span>
          {edited && (
            <button
              className="chart-type-btn"
              onClick={() => {
                setPv(null);
                setPmt(null);
                setRatePct(String(DEFAULT_RATE));
                setYearsStr(String(DEFAULT_YEARS));
              }}
            >
              Reset to my data
            </button>
          )}
        </div>
        <div className="chart-card-value pos">{fmt$(last.value, true)}</div>
        <div className="chart-card-change pos">
          in {n} {n === 1 ? 'year' : 'years'} ({last.date}) · {fmt$(last.growth, true)} from growth
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          <div className="field-row">
            {field('Starting value (PV, $)', pv, defaultPv, setPv)}
            {field('Added per year (PMT, $)', pmt, defaultPmt, setPmt)}
          </div>
          <div className="field-row">
            {field('Annual return % (i)', ratePct, DEFAULT_RATE, setRatePct)}
            {field('Years (n)', yearsStr, DEFAULT_YEARS, setYearsStr)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>
            PV×(1+i)^n + PMT×((1+i)^n−1)÷i · contribution added at each year end
          </div>
          <div className="data-table-wrap" style={{ maxHeight: 220, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Year</th>
                  <th>Value</th>
                  <th>Contributed</th>
                  <th>Growth</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.year}>
                    <td style={{ textAlign: 'left' }}>
                      {r.year} · {r.date}
                    </td>
                    <td className="pos">{fmt$(r.value)}</td>
                    <td className="neu">{fmt$(r.contributed)}</td>
                    <td className="pos">{fmt$(r.growth)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ChartCard
        label="Projected Value"
        value={fmt$(last.value, true)}
        change={`${fmt$(last.contributed, true)} contributed`}
        changePositive={null}
        modalContent={chart}
      >
        {chart}
      </ChartCard>
    </div>
  );
}
