import { useState } from 'react';
import { WealthData as D } from '../data/wealthData';
import { ChartCard } from '../components/ChartCard';
import { TimeRange } from '../components/TimeRange';
import { EntriesLog } from '../components/EntriesLog';
import { AreaChart } from '../components/charts/AreaChart';
import { MultiLineChart } from '../components/charts/MultiLineChart';
import { FlexBarChart } from '../components/charts/FlexBarChart';
import { GroupedBarChart } from '../components/charts/GroupedBarChart';
import { DonutChart } from '../components/charts/DonutChart';
import { fmt$, fmtSign$, fmtPct, clsROI } from '../lib/formatters';
import { sliceRange, type Range } from '../lib/ranges';
import { buildAnnotations, C } from '../lib/chartDefaults';
import { type Entry } from '../lib/storage';

const CHART_OPTS = [{ value: 'bar', label: 'Bar' }, { value: 'line', label: 'Line' }];

interface DashboardProps {
  showModal: () => void;
  entries: Entry[];
  onEditEntry: (entry: Entry) => void;
  onDeleteEntry: (id: number) => void;
}

export function Dashboard({ showModal, entries, onEditEntry, onDeleteEntry }: DashboardProps) {
  const [range, setRange] = useState<Range>('ALL');
  const [showEvents, setShowEvents] = useState(true);
  const [portfolioValueType, setPortfolioValueType] = useState<'area' | 'bar'>('area');
  const [roiBenchmarkType, setRoiBenchmarkType] = useState<'line' | 'bar'>('line');
  const [totalChartType, setTotalChartType] = useState<'bar' | 'line'>('bar');
  const [cryptoChartType, setCryptoChartType] = useState<'bar' | 'line'>('bar');
  const [stocksChartType, setStocksChartType] = useState<'bar' | 'line'>('bar');

  const { start } = sliceRange(range);
  const labels = D.months.slice(start);
  const cur = D.current;
  const ann = buildAnnotations(labels, showEvents);

  const totalRoiLast = D.totalRoi[D.N - 1];
  const totalRoiPrev = D.totalRoi[D.N - 2];
  const roiDelta = totalRoiLast - totalRoiPrev;

  const monthlyCrypto = D.cryptoInvested.map((v, i) =>
    i === 0 ? v : Math.max(0, Math.round(v - D.cryptoInvested[i - 1])));
  const monthlyStocks = D.stocksInvested.map((v, i) =>
    i === 0 ? v : Math.max(0, Math.round(v - D.stocksInvested[i - 1])));

  const slicedCrypto = monthlyCrypto.slice(start);
  const slicedStocks = monthlyStocks.slice(start);
  const totalCrypto = slicedCrypto.reduce((a, b) => a + b, 0);
  const totalStocks = slicedStocks.reduce((a, b) => a + b, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div>
            <div className="page-title">Dashboard</div>
            <div className="page-sub">Apr 2026 · All investments</div>
          </div>
          {entries.length > 0 && <span className="entries-badge">{entries.length}</span>}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="add-btn" onClick={showModal}>+ Add Entry</button>
          <TimeRange value={range} onChange={setRange} showEvents={showEvents} onToggleEvents={() => setShowEvents(v => !v)} />
        </div>
      </div>

      {/* KPI Row */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Portfolio Value</div>
          <div className="kpi-value">{fmt$(cur.portfolioValue, true)}</div>
          <div className={`kpi-change ${clsROI(cur.totalRoi)}`}>{fmtPct(cur.totalRoi)} all-time ROI</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Invested</div>
          <div className="kpi-value">{fmt$(cur.totalInvested, true)}</div>
          <div className="kpi-change neu">Crypto + Stocks</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Gain</div>
          <div className={`kpi-value ${clsROI(cur.totalGain)}`}>{fmtSign$(cur.totalGain)}</div>
          <div className={`kpi-change ${roiDelta >= 0 ? 'pos' : 'neg'}`}>{fmtPct(roiDelta)} vs last month</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Best Asset</div>
          <div className="kpi-value" style={{ color: C.purple }}>Crypto</div>
          <div className="kpi-change pos">{fmtPct(cur.cryptoRoi)} ROI</div>
        </div>
      </div>

      {/* Charts */}
      <div className="chart-grid">
        <ChartCard
          label="Portfolio Value"
          value={fmt$(cur.portfolioValue, true)}
          change={fmtPct(cur.totalRoi) + ' all-time'}
          changePositive={cur.totalRoi >= 0}
          typeToggle={{
            value: portfolioValueType,
            onChange: (v) => setPortfolioValueType(v as 'area' | 'bar'),
            options: [
              { value: 'area', label: 'Area' },
              { value: 'bar', label: 'Bar' },
            ],
          }}
          modalContent={portfolioValueType === 'area' ? (
            <AreaChart labels={labels} annotations={ann} datasets={[
              { label: 'Total Value', data: D.totalReturn.slice(start), color: C.green },
              { label: 'Invested',    data: D.totalInvested.slice(start), color: C.blue },
            ]} />
          ) : (
            <GroupedBarChart
              labels={labels}
              dataset1={{ label: 'Total Value', data: D.totalReturn.slice(start), color: C.green }}
              dataset2={{ label: 'Invested', data: D.totalInvested.slice(start), color: C.blue }}
            />
          )}
        >
          {portfolioValueType === 'area' ? (
            <AreaChart labels={labels} datasets={[
              { label: 'Total Value', data: D.totalReturn.slice(start), color: C.green },
              { label: 'Invested',    data: D.totalInvested.slice(start), color: C.blue },
            ]} />
          ) : (
            <GroupedBarChart
              labels={labels}
              dataset1={{ label: 'Total Value', data: D.totalReturn.slice(start), color: C.green }}
              dataset2={{ label: 'Invested', data: D.totalInvested.slice(start), color: C.blue }}
            />
          )}
        </ChartCard>

        <ChartCard
          label="ROI vs Benchmarks"
          value={fmtPct(cur.totalRoi)}
          change={fmtPct(cur.totalRoi - D.spxRoi[D.N - 1]) + ' vs S&P 500'}
          changePositive={cur.totalRoi > D.spxRoi[D.N - 1]}
          typeToggle={{
            value: roiBenchmarkType,
            onChange: (v) => setRoiBenchmarkType(v as 'line' | 'bar'),
            options: [
              { value: 'line', label: 'Line' },
              { value: 'bar', label: 'Bar' },
            ],
          }}
          modalContent={roiBenchmarkType === 'line' ? (
            <MultiLineChart labels={labels} annotations={ann} datasets={[
              { label: 'Portfolio ROI', data: D.totalRoi.slice(start), color: C.green },
              { label: 'S&P 500',       data: D.spxRoi.slice(start),   color: C.orange, dashed: true },
              { label: 'Nasdaq',        data: D.nasdaqRoi.slice(start), color: C.yellow, dashed: true },
            ]} />
          ) : (
            <MultiLineChart labels={labels} datasets={[
              { label: 'Portfolio ROI', data: D.totalRoi.slice(start), color: C.green },
              { label: 'S&P 500',       data: D.spxRoi.slice(start),   color: C.orange },
              { label: 'Nasdaq',        data: D.nasdaqRoi.slice(start), color: C.yellow },
            ]} />
          )}
        >
          {roiBenchmarkType === 'line' ? (
            <MultiLineChart labels={labels} datasets={[
              { label: 'Portfolio ROI', data: D.totalRoi.slice(start), color: C.green },
              { label: 'S&P 500',       data: D.spxRoi.slice(start),   color: C.orange, dashed: true },
              { label: 'Nasdaq',        data: D.nasdaqRoi.slice(start), color: C.yellow, dashed: true },
            ]} />
          ) : (
            <MultiLineChart labels={labels} datasets={[
              { label: 'Portfolio ROI', data: D.totalRoi.slice(start), color: C.green },
              { label: 'S&P 500',       data: D.spxRoi.slice(start),   color: C.orange },
              { label: 'Nasdaq',        data: D.nasdaqRoi.slice(start), color: C.yellow },
            ]} />
          )}
        </ChartCard>

        <ChartCard
          label="Monthly Invested"
          value={fmt$(D.monthlyTotalInvested.slice(start).reduce((a, b) => a + b, 0), true)}
          change={`Total added (${range})`}
          changePositive={null}
          typeToggle={{ value: totalChartType, onChange: v => setTotalChartType(v as 'bar' | 'line'), options: CHART_OPTS }}
          modalContent={<FlexBarChart labels={labels} data={D.monthlyTotalInvested.slice(start)} color={C.blue} chartType={totalChartType} />}
        >
          <FlexBarChart labels={labels} data={D.monthlyTotalInvested.slice(start)} color={C.blue} chartType={totalChartType} />
        </ChartCard>
      </div>

      {/* Monthly breakdown: Crypto vs Stocks */}
      <div>
        <div className="section-row" style={{ marginBottom: 10 }}>
          <div className="section-title">Monthly Invested · Breakdown</div>
        </div>
        <div className="chart-grid">
          <ChartCard
            label="Monthly Crypto Invested"
            value={fmt$(totalCrypto, true)}
            change={`Added in ${range}`}
            changePositive={null}
            typeToggle={{ value: cryptoChartType, onChange: v => setCryptoChartType(v as 'bar' | 'line'), options: CHART_OPTS }}
            modalContent={<FlexBarChart labels={labels} data={slicedCrypto} color={C.purple} chartType={cryptoChartType} />}
          >
            <FlexBarChart labels={labels} data={slicedCrypto} color={C.purple} chartType={cryptoChartType} />
          </ChartCard>

          <ChartCard
            label="Monthly Stocks Invested"
            value={fmt$(totalStocks, true)}
            change={`Added in ${range}`}
            changePositive={null}
            typeToggle={{ value: stocksChartType, onChange: v => setStocksChartType(v as 'bar' | 'line'), options: CHART_OPTS }}
            modalContent={<FlexBarChart labels={labels} data={slicedStocks} color={C.blue} chartType={stocksChartType} />}
          >
            <FlexBarChart labels={labels} data={slicedStocks} color={C.blue} chartType={stocksChartType} />
          </ChartCard>
        </div>
      </div>

      {/* Allocation */}
      <div className="chart-grid">
        <ChartCard
          label="Allocation"
          value={`${D.cryptoAlloc[D.N - 1]}% Crypto`}
          change={`${D.stocksAlloc[D.N - 1]}% Stocks`}
          changePositive={null}
        >
          <div className="donut-wrap">
            <DonutChart values={[D.cryptoAlloc[D.N - 1], D.stocksAlloc[D.N - 1]]} colors={[C.purple, C.blue]} />
            <div className="donut-legend">
              <div className="donut-item">
                <div className="donut-item-label"><span className="donut-dot" style={{ background: C.purple }} />Crypto</div>
                <div className="donut-item-value" style={{ color: C.purple }}>{D.cryptoAlloc[D.N - 1]}%</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{fmt$(cur.cryptoInvested, true)} invested</div>
              </div>
              <div className="donut-item">
                <div className="donut-item-label"><span className="donut-dot" style={{ background: C.blue }} />Stocks</div>
                <div className="donut-item-value" style={{ color: C.blue }}>{D.stocksAlloc[D.N - 1]}%</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{fmt$(cur.stocksInvested, true)} invested</div>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* My Entries */}
      <div>
        <div className="section-row" style={{ marginBottom: 10 }}>
          <div className="section-title">
            My Entries {entries.length > 0 && <span className="entries-badge">{entries.length}</span>}
          </div>
          <button className="add-btn" onClick={showModal} style={{ fontSize: 12, padding: '5px 12px' }}>+ Add Entry</button>
        </div>
        <EntriesLog entries={entries} onEdit={onEditEntry} onDelete={onDeleteEntry} />
      </div>
    </div>
  );
}
