import { useState, useEffect } from 'react';
import { SavingsEntryModal } from '../components/SavingsEntryModal';
import { ChartCard } from '../components/ChartCard';
import { SavingsRateFlexChart } from '../components/charts/SavingsRateFlexChart';
import { IncomeExpFlexChart } from '../components/charts/IncomeExpFlexChart';
import { CumSavingsFlexChart } from '../components/charts/CumSavingsFlexChart';
import { AnnualSavingsFlexChart } from '../components/charts/AnnualSavingsFlexChart';
import { IncomeHistoryFlexChart } from '../components/charts/IncomeHistoryFlexChart';
import { api } from '../lib/api';
import { getCurrencyFormatter } from '../lib/formatters';
import { loadSavingsEntries, type SavingsEntry } from '../lib/storage';
import { groupByYear } from '../lib/groupByYear';
import { YearToggle } from '../components/YearToggle';
1
const btnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 13, padding: '2px 5px', borderRadius: 4, lineHeight: 1,
};

const MO_ORDER: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

const getMonthLabel = (entry: SavingsEntry): string => {
  return `${entry.mo} ${entry.yr}`;
};

interface SavingsProps {
  showModal: () => void;
  onEdit: (entry: any) => void;
  onDelete: (id: number) => void;
  savingsRefreshKey?: number;
}

export function Savings({ showModal: _showModal, onEdit: _onEdit, onDelete: _onDelete, savingsRefreshKey = 0 }: SavingsProps) {
  const [savingsModal, setSavingsModal] = useState<SavingsEntry | null | false>(false);
  const [savingsEntries, setSavingsEntries] = useState<SavingsEntry[]>(() => loadSavingsEntries());
  const [savingsTarget, setSavingsTarget] = useState<number>(30);
  const [targetInput, setTargetInput] = useState<string>('30');
  const [isSaving, setIsSaving] = useState(false);
  const [currency, setCurrency] = useState<string>('RON');
  const [isSavingCurrency, setIsSavingCurrency] = useState(false);
  const [savingRateChartType, setSavingRateChartType] = useState<'line' | 'bar'>('line');
  const [incomeExpChartType, setIncomeExpChartType] = useState<'line' | 'bar'>('line');
  const [cumSavingsChartType, setCumSavingsChartType] = useState<'line' | 'bar'>('line');
  const [annualSavingsChartType, setAnnualSavingsChartType] = useState<'bar' | 'line'>('line');
  const [incomeHistoryChartType, setIncomeHistoryChartType] = useState<'line' | 'bar'>('bar');
  const [incomeHistGrouping, setIncomeHistGrouping] = useState<'month' | 'year'>('month');
  const [savingRateGrouping, setSavingRateGrouping] = useState<'month' | 'year'>('month');
  const [incomeExpGrouping, setIncomeExpGrouping] = useState<'month' | 'year'>('month');
  const [cumSavingsGrouping, setCumSavingsGrouping] = useState<'month' | 'year'>('month');
  const [avgRateGrouping, setAvgRateGrouping] = useState<'month' | 'year'>('month');

  useEffect(() => {
    api.savings.list().then(setSavingsEntries).catch(console.error);
    api.settings.getSavingsTarget()
      .then(setting => {
        setSavingsTarget(setting.value);
        setTargetInput(setting.value.toString());
      })
      .catch(console.error);
    api.settings.getCurrency()
      .then(setting => {
        setCurrency(setting.value);
      })
      .catch(console.error);
  }, [savingsRefreshKey]);

  const handleSaveTarget = async () => {
    const value = parseFloat(targetInput);
    if (isNaN(value)) {
      console.error('Invalid target value');
      return;
    }
    setIsSaving(true);
    try {
      const result = await api.settings.setSavingsTarget(value);
      setSavingsTarget(result.value);
    } catch (err) {
      console.error('Failed to save target:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCurrency = async (newCurrency: string) => {
    setCurrency(newCurrency);
    setIsSavingCurrency(true);
    try {
      await api.settings.setCurrency(newCurrency);
    } catch (err) {
      console.error('Failed to save currency:', err);
      // Revert on error
      setCurrency(currency);
    } finally {
      setIsSavingCurrency(false);
    }
  };

  const handleDeleteMonth = (entryId: number) => {
    api.savings.remove(entryId)
      .then(() => {
        api.savings.list().then(setSavingsEntries).catch(console.error);
      })
      .catch(err => {
        console.error('Delete failed:', err);
      });
  };

  // Calculate aggregated stats from entries
  const sorted = [...savingsEntries].sort((a, b) => b.yr !== a.yr ? b.yr - a.yr : (MO_ORDER[b.mo] || 0) - (MO_ORDER[a.mo] || 0));
  const sortedChronological = [...savingsEntries].sort((a, b) => a.yr !== b.yr ? a.yr - b.yr : (MO_ORDER[a.mo] || 0) - (MO_ORDER[b.mo] || 0));
  const current = sorted[0] || { netIncome: 0, totalExpenses: 0, savings: 0, savingRate: 0 };
  const totalSavings = savingsEntries.reduce((sum, e) => sum + e.savings, 0);
  const avgRate = savingsEntries.length > 0 ? Math.round((savingsEntries.reduce((sum, e) => sum + e.savingRate, 0) / savingsEntries.length) * 10) / 10 : 0;
  const vsTarget = Math.round((current.savingRate - savingsTarget) * 10) / 10;
  const fmt = getCurrencyFormatter(currency);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {savingsModal !== false && (
        <SavingsEntryModal
          entry={savingsModal || undefined}
          onClose={() => setSavingsModal(false)}
          onSave={() => {
            api.savings.list().then(setSavingsEntries).catch(console.error);
          }}
          globalTarget={savingsTarget}
        />
      )}

      <div className="page-header">
        <div>
          <div className="page-title">Savings</div>
          <div className="page-sub">Track your savings entries</div>
        </div>
      </div>

      {savingsEntries.length > 0 && (
        <>
          {/* KPIs */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-label">Saving Rate (Current)</div>
              <div className={`kpi-value ${vsTarget >= 0 ? 'pos' : 'neg'}`}>{current.savingRate.toFixed(1)}%</div>
              <div className={`kpi-change ${vsTarget >= 0 ? 'pos' : 'neg'}`}>
                {vsTarget >= 0 ? '▲' : '▼'} {Math.abs(vsTarget)}% vs {savingsTarget}% target
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Current Income</div>
              <div className="kpi-value">{fmt(current.netIncome)}</div>
              <div className="kpi-change neu">Last entry</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Current Expenses</div>
              <div className="kpi-value neg">{fmt(current.totalExpenses)}</div>
              <div className="kpi-change neu">{current.netIncome > 0 ? Math.round(current.totalExpenses / current.netIncome * 100) : 0}% of income</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Total Saved</div>
              <div className="kpi-value pos">{fmt(totalSavings)}</div>
              <div className="kpi-change neu">All entries</div>
            </div>
          </div>

          {/* Income History — full width */}
          {(() => {
            const moLabels = sortedChronological.map(e => getMonthLabel(e));
            const moIncome = sortedChronological.map(e => e.netIncome);
            const _grp = incomeHistGrouping === 'year'
              ? groupByYear(moLabels, [moIncome], ['sum'])
              : null;
            const ihLabels = _grp ? _grp.years : moLabels;
            const ihIncome = (_grp ? _grp.grouped[0] : moIncome) as number[];
            return (
              <ChartCard
                label={incomeHistGrouping === 'year' ? 'Annual Income History' : 'Monthly Income History'}
                value={fmt(current.netIncome)}
                change="With polynomial trend"
                changePositive={null}
                extraControls={<YearToggle value={incomeHistGrouping} onChange={setIncomeHistGrouping} />}
                typeToggle={{
                  value: incomeHistoryChartType,
                  onChange: (v) => setIncomeHistoryChartType(v as 'line' | 'bar'),
                  options: [
                    { value: 'bar', label: 'Bar' },
                    { value: 'line', label: 'Line' },
                  ],
                }}
                modalContent={
                  <IncomeHistoryFlexChart labels={ihLabels} income={ihIncome} chartType={incomeHistoryChartType} formatValue={fmt} />
                }
              >
                <IncomeHistoryFlexChart labels={ihLabels} income={ihIncome} chartType={incomeHistoryChartType} formatValue={fmt} />
              </ChartCard>
            );
          })()}

          {/* Charts */}
          <div className="chart-grid">
            {/* Saving Rate Trend */}
            {(() => {
              const moLabels = sortedChronological.map(e => getMonthLabel(e));
              const moRates = sortedChronological.map(e => e.savingRate);
              const moTargets = sortedChronological.map(() => savingsTarget);
              const _grp = savingRateGrouping === 'year'
                ? groupByYear(moLabels, [moRates, moTargets], ['avg', 'last'])
                : null;
              const srLabels = _grp ? _grp.years : moLabels;
              const srRates = (_grp ? _grp.grouped[0] : moRates) as number[];
              const srTargets = (_grp ? _grp.grouped[1] : moTargets) as number[];
              return (
                <ChartCard
                  label="Saving Rate Trend"
                  value={current.savingRate.toFixed(1) + '%'}
                  change={vsTarget >= 0 ? `+${vsTarget}% above target` : `${vsTarget}% below target`}
                  changePositive={vsTarget >= 0}
                  extraControls={<YearToggle value={savingRateGrouping} onChange={setSavingRateGrouping} />}
                  typeToggle={{
                    value: savingRateChartType,
                    onChange: (v) => setSavingRateChartType(v as 'line' | 'bar'),
                    options: [{ value: 'line', label: 'Line' }, { value: 'bar', label: 'Bar' }],
                  }}
                  modalContent={<SavingsRateFlexChart labels={srLabels} rates={srRates} targets={srTargets} chartType={savingRateChartType} />}
                >
                  <SavingsRateFlexChart labels={srLabels} rates={srRates} targets={srTargets} chartType={savingRateChartType} />
                </ChartCard>
              );
            })()}

            {/* Income vs Expenses */}
            {(() => {
              const moLabels = sortedChronological.map(e => getMonthLabel(e));
              const moIncome = sortedChronological.map(e => e.netIncome);
              const moExp = sortedChronological.map(e => e.totalExpenses);
              const _grp = incomeExpGrouping === 'year'
                ? groupByYear(moLabels, [moIncome, moExp], ['sum', 'sum'])
                : null;
              const ieLabels = _grp ? _grp.years : moLabels;
              const ieIncome = (_grp ? _grp.grouped[0] : moIncome) as number[];
              const ieExp = (_grp ? _grp.grouped[1] : moExp) as number[];
              return (
                <ChartCard
                  label="Income vs Expenses"
                  value={fmt(current.netIncome)}
                  change={fmt(current.savings) + ' saved'}
                  changePositive={current.savings > 0}
                  extraControls={<YearToggle value={incomeExpGrouping} onChange={setIncomeExpGrouping} />}
                  typeToggle={{
                    value: incomeExpChartType,
                    onChange: (v) => setIncomeExpChartType(v as 'line' | 'bar'),
                    options: [{ value: 'line', label: 'Line' }, { value: 'bar', label: 'Bar' }],
                  }}
                  modalContent={<IncomeExpFlexChart labels={ieLabels} income={ieIncome} expenses={ieExp} chartType={incomeExpChartType} />}
                >
                  <IncomeExpFlexChart labels={ieLabels} income={ieIncome} expenses={ieExp} chartType={incomeExpChartType} />
                </ChartCard>
              );
            })()}

            {/* Cumulative Savings */}
            {(() => {
              const moLabels = sortedChronological.map(e => getMonthLabel(e));
              const cumData = sortedChronological.reduce<number[]>((acc, e) => {
                acc.push((acc[acc.length - 1] || 0) + e.savings);
                return acc;
              }, []);
              const _grp = cumSavingsGrouping === 'year'
                ? groupByYear(moLabels, [cumData], ['last'])
                : null;
              const csLabels = _grp ? _grp.years : moLabels;
              const csData = (_grp ? _grp.grouped[0] : cumData) as number[];
              return (
                <ChartCard
                  label="Cumulative Savings"
                  value={fmt(totalSavings)}
                  change="Total saved"
                  changePositive={true}
                  extraControls={<YearToggle value={cumSavingsGrouping} onChange={setCumSavingsGrouping} />}
                  typeToggle={{
                    value: cumSavingsChartType,
                    onChange: (v) => setCumSavingsChartType(v as 'line' | 'bar'),
                    options: [{ value: 'line', label: 'Line' }, { value: 'bar', label: 'Bar' }],
                  }}
                  modalContent={<CumSavingsFlexChart labels={csLabels} data={csData} chartType={cumSavingsChartType} />}
                >
                  <CumSavingsFlexChart labels={csLabels} data={csData} chartType={cumSavingsChartType} />
                </ChartCard>
              );
            })()}

            {/* Average Rate */}
            {(() => {
              const monthlyStats = sortedChronological.map(e => ({
                year: e.yr, months: 1,
                totalInc: e.netIncome, totalExp: e.totalExpenses, totalSav: e.savings,
                avgRate: e.savingRate, target: savingsTarget, vsTarget: e.savingRate - savingsTarget,
                monthlyAvgInc: e.netIncome, monthlyAvgSav: e.savings, mo: e.mo,
              }));
              const yearlyStats = avgRateGrouping === 'year'
                ? Array.from(
                    sortedChronological.reduce((map, e) => {
                      if (!map.has(e.yr)) map.set(e.yr, []);
                      map.get(e.yr)!.push(e);
                      return map;
                    }, new Map<number, SavingsEntry[]>())
                  )
                  .sort((a, b) => a[0] - b[0])
                  .map(([yr, entries]) => {
                    const avgRate = entries.reduce((s, e) => s + e.savingRate, 0) / entries.length;
                    return {
                      year: yr, months: entries.length,
                      totalInc: entries.reduce((s, e) => s + e.netIncome, 0),
                      totalExp: entries.reduce((s, e) => s + e.totalExpenses, 0),
                      totalSav: entries.reduce((s, e) => s + e.savings, 0),
                      avgRate, target: savingsTarget, vsTarget: avgRate - savingsTarget,
                      monthlyAvgInc: entries.reduce((s, e) => s + e.netIncome, 0) / entries.length,
                      monthlyAvgSav: entries.reduce((s, e) => s + e.savings, 0) / entries.length,
                    };
                  })
                : null;
              const arStats = yearlyStats ?? monthlyStats;
              return (
                <ChartCard
                  label="Average Rate"
                  value={avgRate.toFixed(1) + '%'}
                  change="Across all entries"
                  changePositive={null}
                  extraControls={<YearToggle value={avgRateGrouping} onChange={setAvgRateGrouping} />}
                  typeToggle={{
                    value: annualSavingsChartType,
                    onChange: (v) => setAnnualSavingsChartType(v as 'bar' | 'line'),
                    options: [{ value: 'line', label: 'Line' }, { value: 'bar', label: 'Bar' }],
                  }}
                  modalContent={<AnnualSavingsFlexChart stats={arStats} chartType={annualSavingsChartType} />}
                >
                  <AnnualSavingsFlexChart stats={arStats} chartType={annualSavingsChartType} />
                </ChartCard>
              );
            })()}
          </div>
        </>
      )}

      {/* Monthly table */}
      <div>
        <div className="section-row" style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div className="section-title">Monthly Breakdown {savingsEntries.length > 0 && <span className="entries-badge">{savingsEntries.length}</span>}</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Savings Target (%)</label>
              <input
                type="number"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                style={{
                  width: 80,
                  padding: '6px 10px',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  fontSize: 13,
                  backgroundColor: 'var(--bg)',
                  color: 'var(--text)',
                }}
              />
            </div>
            <button
              onClick={handleSaveTarget}
              disabled={isSaving}
              style={{
                padding: '6px 12px',
                backgroundColor: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                fontSize: 13,
                opacity: isSaving ? 0.6 : 1,
              }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: 'var(--text3)' }}>Currency</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {['EUR', 'USD', 'RON'].map(c => (
                  <button
                    key={c}
                    onClick={() => handleSaveCurrency(c)}
                    disabled={isSavingCurrency}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: currency === c ? 'var(--primary)' : 'var(--surface2)',
                      color: currency === c ? 'white' : 'var(--text)',
                      border: `1px solid ${currency === c ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: currency === c ? 600 : 400,
                      cursor: isSavingCurrency ? 'not-allowed' : 'pointer',
                      opacity: isSavingCurrency ? 0.6 : 1,
                      transition: 'all .15s',
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <button className="add-btn" onClick={() => setSavingsModal(null)} style={{ fontSize: 12, padding: '5px 12px' }}>+ Add</button>
          </div>
        </div>
        {savingsEntries.length === 0 ? (
          <div style={{ color: 'var(--text3)', textAlign: 'center', padding: '40px 20px', fontSize: 14 }}>
            No entries yet. Import a CSV in Settings or add entries manually.
          </div>
        ) : (
          <div className="data-table-wrap">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr><th>Month</th><th>Net Income</th><th>Expenses</th><th>Saved</th><th>Rate %</th><th></th></tr>
                </thead>
                <tbody>
                  {savingsEntries
                    .sort((a, b) => b.yr !== a.yr ? b.yr - a.yr : (MO_ORDER[b.mo] || 0) - (MO_ORDER[a.mo] || 0))
                    .map(entry => (
                      <tr key={entry.id}>
                        <td>{entry.monthFull}</td>
                        <td>{fmt(entry.netIncome)}</td>
                        <td className="neg">{fmt(entry.totalExpenses)}</td>
                        <td className="pos">{fmt(entry.savings)}</td>
                        <td className={entry.savingRate >= savingsTarget ? 'pos' : 'neg'}>{entry.savingRate.toFixed(1)}%</td>
                        <td>
                          <div style={{ display: 'flex', gap: 2 }}>
                            <button onClick={() => setSavingsModal(entry)} style={{ ...btnStyle, color: 'var(--text3)' }} title="Edit">✎</button>
                            <button onClick={() => handleDeleteMonth(entry.id)} style={{ ...btnStyle, color: 'var(--text3)' }} title="Delete">✕</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
