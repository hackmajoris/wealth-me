import { useState, useMemo } from 'react';
import type { Entry } from '../lib/storage';
import { EntryModal } from '../components/EntryModal';
import { ChartCard } from '../components/ChartCard';
import { TimeRange } from '../components/TimeRange';
import { AreaChart } from '../components/charts/AreaChart';
import { LineChart } from '../components/charts/LineChart';
import { GainFlexChart } from '../components/charts/GainFlexChart';
import { InvestedChart } from '../components/charts/InvestedChart';
import { fmt$, fmtSign$, fmtPct, clsROI } from '../lib/formatters';
import { sliceRange, type Range } from '../lib/ranges';
import { buildAnnotations, C } from '../lib/chartDefaults';
import { calcAverage } from '../lib/trendUtils';
import { useChart } from '../components/charts/useChart';
import { chartDefaults } from '../lib/chartDefaults';
import type { TooltipItem } from 'chart.js';

const MO_ORDER: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};
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

interface StocksProps {
  showModal: () => void;
  entries: Entry[];
  onDelete: (id: number) => void;
  onRefresh?: () => void;
}

const btnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 13,
  padding: '2px 5px',
  borderRadius: 4,
  lineHeight: 1,
};

function ValueAndInvestedBarChart({
  labels,
  value,
  invested,
  valueColor,
  investedColor,
}: {
  labels: string[];
  value: number[];
  invested: number[];
  valueColor: string;
  investedColor: string;
}) {
  const ref = useChart({
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Value',
          data: value,
          backgroundColor: valueColor + 'aa',
          borderColor: valueColor,
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Invested',
          data: invested,
          backgroundColor: investedColor + 'aa',
          borderColor: investedColor,
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      ...chartDefaults,
      plugins: {
        ...chartDefaults.plugins,
        tooltip: {
          ...((chartDefaults.plugins as Record<string, unknown>)['tooltip'] as object),
          mode: 'index',
          intersect: false,
          callbacks: {
            label: (ctx: TooltipItem<'bar'>) =>
              `${ctx.dataset.label}: $${Math.round(ctx.parsed.y ?? 0).toLocaleString()}`,
          },
        },
      },
      scales: {
        x: {
          ...chartDefaults.scales?.['x'],
          ticks: {
            ...(chartDefaults.scales?.['x'] as any)?.['ticks'],
            maxRotation: 44,
            minRotation: 44,
          } as any,
        },
        y: {
          ...chartDefaults.scales?.['y'],
          ticks: {
            ...(chartDefaults.scales?.['y'] as any)?.['ticks'],
            callback: (v: number | string) => {
              const n = Number(v);
              return '$' + (n >= 1000 ? (n / 1000).toFixed(0) + 'k' : n);
            },
          } as any,
        },
      } as any,
    },
  });
  return <canvas ref={ref} />;
}

export function Stocks({ showModal, entries, onDelete, onRefresh }: StocksProps) {
  const [range, setRange] = useState<Range>('ALL');
  const [showEvents, setShowEvents] = useState(true);
  const [returnVsInvestedType, setReturnVsInvestedType] = useState<'area' | 'bar'>('area');
  const [gainChartType, setGainChartType] = useState<'bar' | 'line'>('line');
  const [monthlyInvestedType, setMonthlyInvestedType] = useState<'bar' | 'line'>('bar');
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [quickEditEntry, setQuickEditEntry] = useState<Entry | undefined>(undefined);
  const [tableEditEntry, setTableEditEntry] = useState<Entry | undefined>(undefined);

  const data = useMemo(() => {
    const sorted = [...entries]
      .filter((e) => e.stocksInvested > 0 || e.stocksReturn > 0)
      .sort((a, b) => (a.yr !== b.yr ? a.yr - b.yr : MO_ORDER[a.mo] - MO_ORDER[b.mo]));

    const months = sorted.map((e) => e.month);
    const stocksInvested = sorted.map((e) => e.stocksInvested);
    const stocksReturn = sorted.map((e) => e.stocksReturn);
    const stocksGain = sorted.map((e) => e.stocksReturn - e.stocksInvested);
    const stocksRoi: (number | null)[] = sorted.map((e) =>
      e.stocksInvested > 0
        ? Math.round(((e.stocksReturn - e.stocksInvested) / e.stocksInvested) * 1000) / 10
        : null
    );

    const N = sorted.length;
    const last = N - 1;
    const current =
      N > 0
        ? {
            stocksValue: stocksReturn[last],
            stocksInvested: stocksInvested[last],
            stocksGain: stocksGain[last],
            stocksRoi: stocksRoi[last] ?? 0,
          }
        : { stocksValue: 0, stocksInvested: 0, stocksGain: 0, stocksRoi: 0 };

    // Calculate monthly invested (difference from previous month)
    const monthlyInvested = stocksInvested.map((v, i) =>
      i === 0 ? v : Math.max(0, Math.round(v - stocksInvested[i - 1]))
    );

    return {
      months,
      stocksInvested,
      stocksReturn,
      stocksGain,
      stocksRoi,
      monthlyInvested,
      N,
      current,
    };
  }, [entries]);

  const { start } = sliceRange(range, data.N);
  const labels = data.months.slice(start);
  const ann = buildAnnotations(labels, showEvents);

  // Get current and previous month for quick entry
  const now = new Date();
  const currentMonth = MONTH_NAMES[now.getMonth()];
  const currentYear = now.getFullYear();
  const prevMonth = now.getMonth() === 0 ? MONTH_NAMES[11] : MONTH_NAMES[now.getMonth() - 1];
  const prevYear = now.getMonth() === 0 ? currentYear - 1 : currentYear;
  const allowedMonths = [
    { month: prevMonth, year: prevYear },
    { month: currentMonth, year: currentYear },
  ];

  const monthlyInvestedSlice = data.monthlyInvested.slice(start);
  const avgMonthlyInvested = calcAverage(monthlyInvestedSlice);
  const currentMonthInvested = monthlyInvestedSlice[monthlyInvestedSlice.length - 1] || 0;

  if (data.N === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="page-header">
          <div className="page-title">Stocks</div>
          <button className="add-btn" onClick={showModal}>
            + Add Entry
          </button>
        </div>
        <div
          style={{ color: 'var(--text3)', textAlign: 'center', padding: '60px 0', fontSize: 14 }}
        >
          No stocks data yet. Add an entry or import a CSV in Settings.
        </div>
      </div>
    );
  }

  const firstMonth = data.months[0];
  const lastMonth = data.months[data.N - 1];

  const handleQuickEntryOpen = () => {
    // Find if an entry exists for current month, otherwise undefined (create new)
    const currentEntry = entries.find((e) => e.yr === currentYear && e.mo === currentMonth);
    setQuickEditEntry(currentEntry);
    setQuickEntryOpen(true);
  };

  const handleTableEdit = (entry: Entry) => {
    setTableEditEntry(entry);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {quickEntryOpen && (
        <EntryModal
          entry={quickEditEntry}
          type="stocks"
          restrictMonths={allowedMonths}
          onClose={() => {
            setQuickEntryOpen(false);
            setQuickEditEntry(undefined);
          }}
          onSave={() => {
            setQuickEntryOpen(false);
            setQuickEditEntry(undefined);
            onRefresh?.();
          }}
        />
      )}
      {tableEditEntry && (
        <EntryModal
          entry={tableEditEntry}
          type="stocks"
          onClose={() => setTableEditEntry(undefined)}
          onSave={() => {
            setTableEditEntry(undefined);
            onRefresh?.();
          }}
        />
      )}
      <div className="page-header">
        <div className="page-title">
          Stocks{' '}
          <span className="page-sub" style={{ fontWeight: 400 }}>
            {firstMonth} – {lastMonth}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="add-btn" onClick={showModal}>
            + Add Entry
          </button>
          <TimeRange
            value={range}
            onChange={setRange}
            showEvents={showEvents}
            onToggleEvents={() => setShowEvents((v) => !v)}
          />
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Current Value</div>
          <div className="kpi-value pos">{fmt$(data.current.stocksValue, true)}</div>
          <div className="kpi-change pos">{fmtPct(data.current.stocksRoi)} ROI</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Invested</div>
          <div className="kpi-value">{fmt$(data.current.stocksInvested, true)}</div>
          <div className="kpi-change neu">Since {firstMonth}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Gain</div>
          <div className={`kpi-value ${clsROI(data.current.stocksGain)}`}>
            {fmtSign$(data.current.stocksGain)}
          </div>
          <div className="kpi-change neu">Unrealized</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Entries</div>
          <div className="kpi-value">{data.N}</div>
          <div className="kpi-change neu">Monthly snapshots</div>
        </div>
      </div>

      <div className="chart-grid">
        <ChartCard
          label="Return vs Invested"
          value={fmt$(data.current.stocksValue, true)}
          change={fmtPct(data.current.stocksRoi)}
          changePositive={data.current.stocksRoi >= 0}
          typeToggle={{
            value: returnVsInvestedType,
            onChange: (v) => setReturnVsInvestedType(v as 'area' | 'bar'),
            options: [
              { value: 'area', label: 'Area' },
              { value: 'bar', label: 'Bar' },
            ],
          }}
          modalContent={
            returnVsInvestedType === 'area' ? (
              <AreaChart
                labels={labels}
                annotations={ann}
                datasets={[
                  {
                    label: 'Value',
                    data: data.stocksReturn.slice(start).map((v) => v || 0),
                    color: C.blue,
                  },
                  { label: 'Invested', data: data.stocksInvested.slice(start), color: C.red },
                ]}
              />
            ) : (
              <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
                <ValueAndInvestedBarChart
                  labels={labels}
                  value={data.stocksReturn.slice(start).map((v) => v || 0)}
                  invested={data.stocksInvested.slice(start)}
                  valueColor={C.blue}
                  investedColor={C.red}
                />
              </div>
            )
          }
        >
          {returnVsInvestedType === 'area' ? (
            <AreaChart
              labels={labels}
              datasets={[
                {
                  label: 'Value',
                  data: data.stocksReturn.slice(start).map((v) => v || 0),
                  color: C.blue,
                },
                { label: 'Invested', data: data.stocksInvested.slice(start), color: C.red },
              ]}
            />
          ) : (
            <ValueAndInvestedBarChart
              labels={labels}
              value={data.stocksReturn.slice(start).map((v) => v || 0)}
              invested={data.stocksInvested.slice(start)}
              valueColor={C.blue}
              investedColor={C.red}
            />
          )}
        </ChartCard>

        <ChartCard
          label="ROI % over Time"
          value={fmtPct(data.current.stocksRoi)}
          change="Monthly ROI"
          changePositive={data.current.stocksRoi >= 0}
          modalContent={
            <LineChart
              labels={labels}
              data={data.stocksRoi.slice(start).map((v) => v ?? null)}
              color={C.blue}
              yLabel="ROI %"
              isCurrency={false}
            />
          }
        >
          <LineChart
            labels={labels}
            data={data.stocksRoi.slice(start).map((v) => v ?? null)}
            color={C.blue}
            yLabel="ROI %"
            isCurrency={false}
          />
        </ChartCard>

        <ChartCard
          label="Gain $"
          value={fmtSign$(data.current.stocksGain)}
          change={fmtPct(data.current.stocksRoi)}
          changePositive={data.current.stocksGain >= 0}
          typeToggle={{
            value: gainChartType,
            onChange: (v) => setGainChartType(v as 'bar' | 'line'),
            options: [
              { value: 'line', label: 'Line' },
              { value: 'bar', label: 'Bar' },
            ],
          }}
          modalContent={
            <GainFlexChart
              labels={labels}
              data={data.stocksGain.slice(start).map((v) => v || 0)}
              color={C.green}
              chartType={gainChartType}
            />
          }
        >
          <GainFlexChart
            labels={labels}
            data={data.stocksGain.slice(start).map((v) => v || 0)}
            color={C.green}
            chartType={gainChartType}
          />
        </ChartCard>

        <ChartCard
          label="Monthly Invested"
          value={fmt$(
            monthlyInvestedSlice.reduce((a, b) => a + b, 0),
            true
          )}
          change={`Avg: ${fmt$(avgMonthlyInvested, true)} / Current: ${fmt$(currentMonthInvested, true)}`}
          changePositive={currentMonthInvested >= avgMonthlyInvested}
          typeToggle={{
            value: monthlyInvestedType,
            onChange: (v) => setMonthlyInvestedType(v as 'bar' | 'line'),
            options: [
              { value: 'bar', label: 'Bar' },
              { value: 'line', label: 'Line' },
            ],
          }}
          modalContent={
            <InvestedChart
              labels={labels}
              data={monthlyInvestedSlice}
              color={C.blue}
              chartType={monthlyInvestedType}
            />
          }
        >
          <InvestedChart
            labels={labels}
            data={monthlyInvestedSlice}
            color={C.blue}
            chartType={monthlyInvestedType}
          />
        </ChartCard>
      </div>

      <div>
        <div
          className="section-row"
          style={{
            marginBottom: 10,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div className="section-title">Monthly Breakdown</div>
          <button
            className="add-btn"
            onClick={handleQuickEntryOpen}
            style={{ fontSize: 12, padding: '5px 12px' }}
          >
            + Add
          </button>
        </div>
        <div className="data-table-wrap">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Return</th>
                  <th>Invested</th>
                  <th>Gain</th>
                  <th>ROI %</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.months
                  .map((m, idx) => ({ m, idx }))
                  .sort((a, b) => {
                    const entryA = entries.find((e) => e.month === a.m);
                    const entryB = entries.find((e) => e.month === b.m);
                    if (!entryA || !entryB) return 0;
                    if (entryA.yr !== entryB.yr) return entryB.yr - entryA.yr;
                    return (MO_ORDER[entryB.mo] || 0) - (MO_ORDER[entryA.mo] || 0);
                  })
                  .map(({ m, idx }) => {
                    const entry = entries.find((e) => e.month === m);
                    const invested = data.stocksInvested[idx];
                    const ret = data.stocksReturn[idx];
                    const gain = ret - invested;
                    const roi = invested > 0 ? Math.round((gain / invested) * 1000) / 10 : null;
                    return (
                      <tr key={m}>
                        <td>{m}</td>
                        <td>{fmt$(ret)}</td>
                        <td>{fmt$(invested)}</td>
                        <td className={clsROI(gain)}>{fmtSign$(gain)}</td>
                        <td className={clsROI(roi)}>{fmtPct(roi)}</td>
                        <td>
                          {entry && (
                            <div style={{ display: 'flex', gap: 2 }}>
                              <button
                                onClick={() => handleTableEdit(entry)}
                                style={{ ...btnStyle, color: 'var(--text3)' }}
                                title="Edit"
                              >
                                ✎
                              </button>
                              <button
                                onClick={() => onDelete(entry.id)}
                                style={{ ...btnStyle, color: 'var(--text3)' }}
                                title="Delete"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
