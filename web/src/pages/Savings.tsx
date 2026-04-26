import { useState } from 'react';
import { SavingsData as S } from '../data/savingsData';
import { ChartCard } from '../components/ChartCard';
import { TimeRange } from '../components/TimeRange';
import { SavingsEntryModal } from '../components/SavingsEntryModal';
import { SavingsLog } from '../components/SavingsLog';
import { SavingsRateChart } from '../components/charts/SavingsRateChart';
import { IncomeExpChart } from '../components/charts/IncomeExpChart';
import { CumSavingsChart } from '../components/charts/CumSavingsChart';
import { AnnualSavingsBarChart } from '../components/charts/AnnualSavingsBarChart';
import { RON } from '../lib/formatters';
import { sliceRange, type Range } from '../lib/ranges';
import { loadSavingsEntries, saveSavingsEntries, type SavingsEntry } from '../lib/storage';

function heatColor(val: number | null, type: string): string {
  if (type !== 'pct' || val === null) return 'transparent';
  if (val > 10)  return 'rgba(52,211,153,0.2)';
  if (val > 0)   return 'rgba(52,211,153,0.1)';
  if (val > -10) return 'rgba(248,113,113,0.1)';
  return 'rgba(248,113,113,0.2)';
}

interface SavingsProps {
  showModal: () => void;
  onEdit: (entry: any) => void;
  onDelete: (id: number) => void;
}

export function Savings({ showModal: _showModal, onEdit: _onEdit, onDelete: _onDelete }: SavingsProps) {
  const [range, setRange] = useState<Range>('ALL');
  const [savingsModal, setSavingsModal] = useState<SavingsEntry | null | false>(false);
  const [savingsEntries, setSavingsEntries] = useState<SavingsEntry[]>(() => loadSavingsEntries());

  const { start } = sliceRange(range);
  const labels = S.months.slice(start);
  const cur = S.current;
  const vsTarget = Math.round((cur.savingRate - cur.targetRate) * 10) / 10;

  const handleDeleteSavings = (id: number) => {
    const updated = savingsEntries.filter(e => e.id !== id);
    saveSavingsEntries(updated);
    setSavingsEntries(updated);
  };

  const annualLast = S.annualSavings[S.annualSavings.length - 1];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {savingsModal !== false && (
        <SavingsEntryModal
          entry={savingsModal}
          onClose={() => setSavingsModal(false)}
          onSave={updated => setSavingsEntries(updated)}
        />
      )}

      <div className="page-header">
        <div>
          <div className="page-title">Savings</div>
          <div className="page-sub">Sep 2019 – Apr 2026 · RON</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="add-btn" onClick={() => setSavingsModal(null)}>+ Add Entry</button>
          <TimeRange value={range} onChange={setRange} />
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Saving Rate</div>
          <div className={`kpi-value ${vsTarget >= 0 ? 'pos' : 'neg'}`}>{cur.savingRate.toFixed(1)}%</div>
          <div className={`kpi-change ${vsTarget >= 0 ? 'pos' : 'neg'}`}>
            {vsTarget >= 0 ? '▲' : '▼'} {Math.abs(vsTarget)}% vs {cur.targetRate}% target
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Net Income</div>
          <div className="kpi-value">{RON(cur.netIncome)}</div>
          <div className="kpi-change neu">This month</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Expenses</div>
          <div className="kpi-value neg">{RON(cur.totalExpenses)}</div>
          <div className="kpi-change neu">{Math.round(cur.totalExpenses / cur.netIncome * 100)}% of income</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Cumulative Saved</div>
          <div className="kpi-value pos">{RON(cur.cumulative)}</div>
          <div className="kpi-change neu">All time</div>
        </div>
      </div>

      {/* Charts */}
      <div className="chart-grid">
        <ChartCard
          label="Monthly Saving Rate"
          value={cur.savingRate.toFixed(1) + '%'}
          change={vsTarget >= 0 ? `+${vsTarget}% above target` : `${vsTarget}% below target`}
          changePositive={vsTarget >= 0}
          modalContent={<SavingsRateChart labels={labels} rates={S.savingRate.slice(start)} targets={S.targetRate.slice(start)} />}
        >
          <SavingsRateChart labels={labels} rates={S.savingRate.slice(start)} targets={S.targetRate.slice(start)} />
        </ChartCard>

        <ChartCard
          label="Income vs Expenses"
          value={RON(cur.netIncome)}
          change={RON(cur.savings) + ' saved this month'}
          changePositive={cur.savings > 0}
          modalContent={<IncomeExpChart labels={labels} income={S.netIncome.slice(start)} expenses={S.totalExpenses.slice(start)} />}
        >
          <IncomeExpChart labels={labels} income={S.netIncome.slice(start)} expenses={S.totalExpenses.slice(start)} />
        </ChartCard>

        <ChartCard
          label="Cumulative Savings"
          value={RON(cur.cumulative)}
          change="Total saved all time"
          changePositive={true}
          modalContent={<CumSavingsChart labels={labels} data={S.cumulativeSavings.slice(start)} />}
        >
          <CumSavingsChart labels={labels} data={S.cumulativeSavings.slice(start)} />
        </ChartCard>

        <ChartCard
          label="Annual Rate vs Target"
          value={annualLast ? annualLast.avgRate.toFixed(1) + '%' : '—'}
          change="2026 year-to-date"
          changePositive={null}
          modalContent={<AnnualSavingsBarChart stats={S.annualSavings} />}
        >
          <AnnualSavingsBarChart stats={S.annualSavings} />
        </ChartCard>
      </div>

      {/* Annual summary heatmap */}
      <div>
        <div className="section-row" style={{ marginBottom: 10 }}>
          <div className="section-title">Annual Summary</div>
        </div>
        <div className="data-table-wrap" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ minWidth: 600 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Metric</th>
                {S.annualSavings.map(s => <th key={s.year}>{s.year}{s.months < 12 ? '*' : ''}</th>)}
              </tr>
            </thead>
            <tbody>
              {([
                { label: 'Saving Rate',       key: 'avgRate',      fmt: (v: number) => v.toFixed(1)+'%', heat: true },
                { label: 'Target',            key: 'target',       fmt: (v: number) => v+'%',             heat: false },
                { label: 'vs Target',         key: 'vsTarget',     fmt: (v: number) => (v>=0?'+':'')+v+'%', heat: true },
                { label: 'Total Income',      key: 'totalInc',     fmt: (v: number) => RON(v),            heat: false },
                { label: 'Total Saved',       key: 'totalSav',     fmt: (v: number) => RON(v),            heat: false },
                { label: 'Monthly Avg Saved', key: 'monthlyAvgSav',fmt: (v: number) => RON(v),            heat: false },
              ] as { label: string; key: string; fmt: (v: number) => string; heat: boolean }[]).map(row => (
                <tr key={row.label}>
                  <td style={{ fontFamily: 'Outfit', fontSize: 13, fontWeight: 500, color: 'var(--text2)' }}>{row.label}</td>
                  {S.annualSavings.map(s => {
                    const val = s[row.key as keyof typeof s] as number;
                    const bg  = row.heat ? heatColor(val, 'pct') : 'transparent';
                    const col = row.heat ? (val >= 0 ? '#34d399' : '#f87171') : 'var(--text2)';
                    return (
                      <td key={s.year} style={{ background: bg, color: col, fontWeight: 600, fontSize: 12 }}>
                        {row.fmt(val)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>* Partial year</div>
      </div>

      {/* Monthly table */}
      <div>
        <div className="section-row" style={{ marginBottom: 10 }}>
          <div className="section-title">Monthly Breakdown · Last 12 months</div>
        </div>
        <div className="data-table-wrap">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr><th>Month</th><th>Net Income</th><th>Expenses</th><th>Saved</th><th>Rate %</th><th>Target</th><th>Δ Target</th></tr>
              </thead>
              <tbody>
                {S.months.slice(S.N - 12).map((m, i) => {
                  const idx = S.N - 12 + i;
                  const rate = S.savingRate[idx];
                  const tgt  = S.targetRate[idx];
                  const delta = Math.round((rate - tgt) * 10) / 10;
                  return (
                    <tr key={m}>
                      <td>{m}</td>
                      <td>{RON(S.netIncome[idx])}</td>
                      <td className="neg">{RON(S.totalExpenses[idx])}</td>
                      <td className="pos">{RON(S.savings[idx])}</td>
                      <td className={rate >= tgt ? 'pos' : 'neg'}>{rate.toFixed(1)}%</td>
                      <td className="neu">{tgt}%</td>
                      <td className={delta >= 0 ? 'pos' : 'neg'}>{delta >= 0 ? '+' : ''}{delta}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* My Entries */}
      <div>
        <div className="section-row" style={{ marginBottom: 10 }}>
          <div className="section-title">
            My Entries {savingsEntries.length > 0 && <span className="entries-badge">{savingsEntries.length}</span>}
          </div>
          <button className="add-btn" onClick={() => setSavingsModal(null)} style={{ fontSize: 12, padding: '5px 12px' }}>+ Add Entry</button>
        </div>
        <SavingsLog
          entries={savingsEntries}
          onEdit={e => setSavingsModal(e)}
          onDelete={handleDeleteSavings}
        />
      </div>
    </div>
  );
}
