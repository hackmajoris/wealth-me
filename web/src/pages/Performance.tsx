import { useState } from 'react';
import { WealthData as D } from '../data/wealthData';
import { ChartCard } from '../components/ChartCard';
import { TimeRange } from '../components/TimeRange';
import { AreaChart } from '../components/charts/AreaChart';
import { MultiLineChart } from '../components/charts/MultiLineChart';
import { fmt$, fmtSign$, fmtPct, clsROI } from '../lib/formatters';
import { sliceRange, type Range } from '../lib/ranges';
import { buildAnnotations, C } from '../lib/chartDefaults';

interface PerformanceProps { showModal: () => void; }

export function Performance({ showModal }: PerformanceProps) {
  const [range, setRange] = useState<Range>('ALL');
  const [showEvents, setShowEvents] = useState(true);

  const { start } = sliceRange(range);
  const labels = D.months.slice(start);
  const cur = D.current;
  const ann = buildAnnotations(labels, showEvents);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div className="page-title">Performance <span className="page-sub" style={{ fontWeight: 400 }}>Combined analysis</span></div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="add-btn" onClick={showModal}>+ Add Entry</button>
          <TimeRange value={range} onChange={setRange} showEvents={showEvents} onToggleEvents={() => setShowEvents(v => !v)} />
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Combined ROI</div>
          <div className={`kpi-value ${clsROI(cur.totalRoi)}`}>{fmtPct(cur.totalRoi)}</div>
          <div className="kpi-change neu">All time</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">vs S&P 500</div>
          <div className={`kpi-value ${clsROI(cur.totalRoi - D.spxRoi[D.N - 1])}`}>
            {fmtPct(cur.totalRoi - D.spxRoi[D.N - 1])}
          </div>
          <div className="kpi-change neu">Outperformance</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">vs Nasdaq</div>
          <div className={`kpi-value ${clsROI(cur.totalRoi - D.nasdaqRoi[D.N - 1])}`}>
            {fmtPct(cur.totalRoi - D.nasdaqRoi[D.N - 1])}
          </div>
          <div className="kpi-change neu">Outperformance</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Value</div>
          <div className="kpi-value pos">{fmt$(cur.portfolioValue, true)}</div>
          <div className="kpi-change pos">{fmtSign$(cur.totalGain)} gained</div>
        </div>
      </div>

      <div className="chart-grid">
        <ChartCard
          label="ROI vs All Benchmarks"
          value={fmtPct(cur.totalRoi)}
          change="Portfolio vs S&P 500, Nasdaq"
          changePositive={cur.totalRoi >= 0}
          modalContent={<MultiLineChart labels={labels} annotations={ann} datasets={[
            { label: 'Portfolio', data: D.totalRoi.slice(start), color: C.green },
            { label: 'Crypto',    data: D.cryptoRoi.slice(start), color: C.purple },
            { label: 'Stocks',    data: D.stocksRoi.slice(start).map(v => v ?? null), color: C.blue },
            { label: 'S&P 500',   data: D.spxRoi.slice(start),   color: C.orange, dashed: true },
            { label: 'Nasdaq',    data: D.nasdaqRoi.slice(start), color: C.yellow, dashed: true },
          ]} />}
        >
          <MultiLineChart labels={labels} datasets={[
            { label: 'Portfolio', data: D.totalRoi.slice(start), color: C.green },
            { label: 'Crypto',    data: D.cryptoRoi.slice(start), color: C.purple },
            { label: 'Stocks',    data: D.stocksRoi.slice(start).map(v => v ?? null), color: C.blue },
            { label: 'S&P 500',   data: D.spxRoi.slice(start),   color: C.orange, dashed: true },
            { label: 'Nasdaq',    data: D.nasdaqRoi.slice(start), color: C.yellow, dashed: true },
          ]} />
        </ChartCard>

        <ChartCard
          label="Total Portfolio Value"
          value={fmt$(cur.portfolioValue, true)}
          change={fmtPct(cur.totalRoi) + ' all-time return'}
          changePositive={cur.totalRoi >= 0}
          modalContent={<AreaChart labels={labels} annotations={ann} datasets={[
            { label: 'Total Value',    data: D.totalReturn.slice(start),   color: C.green },
            { label: 'Total Invested', data: D.totalInvested.slice(start), color: C.blue },
          ]} />}
        >
          <AreaChart labels={labels} datasets={[
            { label: 'Total Value',    data: D.totalReturn.slice(start),   color: C.green },
            { label: 'Total Invested', data: D.totalInvested.slice(start), color: C.blue },
          ]} />
        </ChartCard>

        <ChartCard
          label="Crypto vs Stocks Value"
          value={`${fmt$(cur.cryptoValue, true)} / ${fmt$(cur.stocksValue, true)}`}
          change="Current value by asset class"
          changePositive={null}
          modalContent={<AreaChart labels={labels} datasets={[
            { label: 'Crypto', data: D.cryptoReturn.slice(start), color: C.purple },
            { label: 'Stocks', data: D.stocksReturn.slice(start).map(v => v || 0), color: C.blue },
          ]} />}
        >
          <AreaChart labels={labels} datasets={[
            { label: 'Crypto', data: D.cryptoReturn.slice(start), color: C.purple },
            { label: 'Stocks', data: D.stocksReturn.slice(start).map(v => v || 0), color: C.blue },
          ]} />
        </ChartCard>

        <ChartCard
          label="Allocation Over Time"
          value={`${D.cryptoAlloc[D.N - 1]}% / ${D.stocksAlloc[D.N - 1]}%`}
          change="Crypto % vs Stocks %"
          changePositive={null}
          modalContent={<MultiLineChart labels={labels} datasets={[
            { label: 'Crypto %', data: D.cryptoAlloc.slice(start), color: C.purple },
            { label: 'Stocks %', data: D.stocksAlloc.slice(start), color: C.blue },
          ]} />}
        >
          <MultiLineChart labels={labels} datasets={[
            { label: 'Crypto %', data: D.cryptoAlloc.slice(start), color: C.purple },
            { label: 'Stocks %', data: D.stocksAlloc.slice(start), color: C.blue },
          ]} />
        </ChartCard>
      </div>

      <div>
        <div className="section-row" style={{ marginBottom: 10 }}>
          <div className="section-title">Cumulative ROI Summary · Last 12 months</div>
        </div>
        <div className="data-table-wrap">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Portfolio</th><th>Crypto ROI</th><th>Stocks ROI</th>
                  <th>S&P 500</th><th>Nasdaq</th>
                  <th>Crypto %</th><th>Stocks %</th>
                </tr>
              </thead>
              <tbody>
                {D.months.slice(D.N - 12).map((m, i) => {
                  const idx = D.N - 12 + i;
                  return (
                    <tr key={m}>
                      <td>{m}</td>
                      <td className={clsROI(D.totalRoi[idx])}>{fmtPct(D.totalRoi[idx])}</td>
                      <td className={clsROI(D.cryptoRoi[idx])}>{fmtPct(D.cryptoRoi[idx])}</td>
                      <td className={clsROI(D.stocksRoi[idx])}>{fmtPct(D.stocksRoi[idx])}</td>
                      <td className={clsROI(D.spxRoi[idx])}>{fmtPct(D.spxRoi[idx])}</td>
                      <td className={clsROI(D.nasdaqRoi[idx])}>{fmtPct(D.nasdaqRoi[idx])}</td>
                      <td className="neu">{D.cryptoAlloc[idx]}%</td>
                      <td className="neu">{D.stocksAlloc[idx]}%</td>
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
