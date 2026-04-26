import { useState, useEffect } from 'react';
import { SavingsEntryModal } from '../components/SavingsEntryModal';
import { ChartCard } from '../components/ChartCard';
import { SavingsRateFlexChart } from '../components/charts/SavingsRateFlexChart';
import { IncomeExpFlexChart } from '../components/charts/IncomeExpFlexChart';
import { CumSavingsFlexChart } from '../components/charts/CumSavingsFlexChart';
import { AnnualSavingsFlexChart } from '../components/charts/AnnualSavingsFlexChart';
import { api } from '../lib/api';
import { getCurrencyFormatter } from '../lib/formatters';
import { loadSavingsEntries, type SavingsEntry } from '../lib/storage';
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

          {/* Charts */}
          <div className="chart-grid">
            <ChartCard
              label="Saving Rate Trend"
              value={current.savingRate.toFixed(1) + '%'}
              change={vsTarget >= 0 ? `+${vsTarget}% above target` : `${vsTarget}% below target`}
              changePositive={vsTarget >= 0}
              typeToggle={{
                value: savingRateChartType,
                onChange: (v) => setSavingRateChartType(v as 'line' | 'bar'),
                options: [
                  { value: 'line', label: 'Line' },
                  { value: 'bar', label: 'Bar' },
                ],
              }}
              modalContent={<SavingsRateFlexChart labels={sortedChronological.map(e => getMonthLabel(e))} rates={sortedChronological.map(e => e.savingRate)} targets={sortedChronological.map(() => savingsTarget)} chartType={savingRateChartType} />}
            >
              <SavingsRateFlexChart labels={sortedChronological.map(e => getMonthLabel(e))} rates={sortedChronological.map(e => e.savingRate)} targets={sortedChronological.map(() => savingsTarget)} chartType={savingRateChartType} />
            </ChartCard>

            <ChartCard
              label="Income vs Expenses"
              value={fmt(current.netIncome)}
              change={fmt(current.savings) + ' saved'}
              changePositive={current.savings > 0}
              typeToggle={{
                value: incomeExpChartType,
                onChange: (v) => setIncomeExpChartType(v as 'line' | 'bar'),
                options: [
                  { value: 'line', label: 'Line' },
                  { value: 'bar', label: 'Bar' },
                ],
              }}
              modalContent={<IncomeExpFlexChart labels={sortedChronological.map(e => getMonthLabel(e))} income={sortedChronological.map(e => e.netIncome)} expenses={sortedChronological.map(e => e.totalExpenses)} chartType={incomeExpChartType} />}
            >
              <IncomeExpFlexChart labels={sortedChronological.map(e => getMonthLabel(e))} income={sortedChronological.map(e => e.netIncome)} expenses={sortedChronological.map(e => e.totalExpenses)} chartType={incomeExpChartType} />
            </ChartCard>

            <ChartCard
              label="Cumulative Savings"
              value={fmt(totalSavings)}
              change="Total saved"
              changePositive={true}
              typeToggle={{
                value: cumSavingsChartType,
                onChange: (v) => setCumSavingsChartType(v as 'line' | 'bar'),
                options: [
                  { value: 'line', label: 'Line' },
                  { value: 'bar', label: 'Bar' },
                ],
              }}
              modalContent={<CumSavingsFlexChart labels={sortedChronological.map(e => getMonthLabel(e))} data={sortedChronological.reduce<number[]>((acc, e) => {
                acc.push((acc[acc.length - 1] || 0) + e.savings);
                return acc;
              }, [])} chartType={cumSavingsChartType} />}
            >
              <CumSavingsFlexChart labels={sortedChronological.map(e => getMonthLabel(e))} data={sortedChronological.reduce<number[]>((acc, e) => {
                acc.push((acc[acc.length - 1] || 0) + e.savings);
                return acc;
              }, [])} chartType={cumSavingsChartType} />
            </ChartCard>

            <ChartCard
              label="Average Rate"
              value={avgRate.toFixed(1) + '%'}
              change="Across all entries"
              changePositive={null}
              typeToggle={{
                value: annualSavingsChartType,
                onChange: (v) => setAnnualSavingsChartType(v as 'bar' | 'line'),
                options: [
                  { value: 'line', label: 'Line' },
                  { value: 'bar', label: 'Bar' },
                ],
              }}
              modalContent={<AnnualSavingsFlexChart stats={sortedChronological.map((e) => ({
                year: e.yr,
                months: 1,
                totalInc: e.netIncome,
                totalExp: e.totalExpenses,
                totalSav: e.savings,
                avgRate: e.savingRate,
                target: savingsTarget,
                vsTarget: e.savingRate - savingsTarget,
                monthlyAvgInc: e.netIncome,
                monthlyAvgSav: e.savings,
                mo: e.mo,
              }))} chartType={annualSavingsChartType} />}
            >
              <AnnualSavingsFlexChart stats={sortedChronological.map((e) => ({
                year: e.yr,
                months: 1,
                totalInc: e.netIncome,
                totalExp: e.totalExpenses,
                totalSav: e.savings,
                avgRate: e.savingRate,
                target: savingsTarget,
                vsTarget: e.savingRate - savingsTarget,
                monthlyAvgInc: e.netIncome,
                monthlyAvgSav: e.savings,
                mo: e.mo,
              }))} chartType={annualSavingsChartType} />
            </ChartCard>
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
