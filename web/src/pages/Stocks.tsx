import { useState } from 'react';
import { WealthData as D } from '../data/wealthData';
import { ChartCard } from '../components/ChartCard';
import { TimeRange } from '../components/TimeRange';
import { AreaChart } from '../components/charts/AreaChart';
import { MultiLineChart } from '../components/charts/MultiLineChart';
import { LineChart } from '../components/charts/LineChart';
import { fmt$, fmtSign$, fmtPct, clsROI } from '../lib/formatters';
import { sliceRange, type Range } from '../lib/ranges';
import { buildAnnotations, C } from '../lib/chartDefaults';

interface StocksProps { showModal: () => void; }

export function Stocks({ showModal }: StocksProps) {
  const [range, setRange] = useState<Range>('ALL');
  const [showEvents, setShowEvents] = useState(true);

  const { start } = sliceRange(range);
  const labels = D.months.slice(start);
  const cur = D.current;
  const ann = buildAnnotations(labels, showEvents);

  const tableStart = Math.max(D.N - 12, 9);
  const tableRows = D.months.slice(tableStart).map((m, i) => {
    const idx = tableStart + i;
    return { month: m, return: D.stocksReturn[idx], invested: D.stocksInvested[idx],
             gain: D.stocksGain[idx], roi: D.stocksRoi[idx] };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div className="page-title">Stocks <span className="page-sub" style={{ fontWeight: 400 }}>Jun 2020 – Apr 2026</span></div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="add-btn" onClick={showModal}>+ Add Entry</button>
          <TimeRange value={range} onChange={setRange} showEvents={showEvents} onToggleEvents={() => setShowEvents(v => !v)} />
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Current Value</div>
          <div className="kpi-value pos">{fmt$(cur.stocksValue, true)}</div>
          <div className="kpi-change pos">{fmtPct(cur.stocksRoi as number)} ROI</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Invested</div>
          <div className="kpi-value">{fmt$(cur.stocksInvested, true)}</div>
          <div className="kpi-change neu">Since Jun 2020</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Gain</div>
          <div className={`kpi-value ${clsROI(cur.stocksGain)}`}>{fmtSign$(cur.stocksGain)}</div>
          <div className="kpi-change neu">Unrealized</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">vs S&P 500</div>
          <div className={`kpi-value ${clsROI((cur.stocksRoi as number) - D.spxRoi[D.N - 1])}`}>
            {fmtPct((cur.stocksRoi as number) - D.spxRoi[D.N - 1])}
          </div>
          <div className="kpi-change neu">Alpha vs benchmark</div>
        </div>
      </div>

      <div className="chart-grid">
        <ChartCard
          label="Return vs Invested"
          value={fmt$(cur.stocksValue, true)}
          change={fmtPct(cur.stocksRoi as number)}
          changePositive={(cur.stocksRoi as number) >= 0}
          modalContent={<AreaChart labels={labels} annotations={ann} datasets={[
            { label: 'Value',    data: D.stocksReturn.slice(start).map(v => v || 0), color: C.blue },
            { label: 'Invested', data: D.stocksInvested.slice(start), color: C.green },
          ]} />}
        >
          <AreaChart labels={labels} datasets={[
            { label: 'Value',    data: D.stocksReturn.slice(start).map(v => v || 0), color: C.blue },
            { label: 'Invested', data: D.stocksInvested.slice(start), color: C.green },
          ]} />
        </ChartCard>

        <ChartCard
          label="ROI % over Time"
          value={fmtPct(cur.stocksRoi as number)}
          change="vs S&P 500 & Nasdaq"
          changePositive={(cur.stocksRoi as number) >= 0}
          modalContent={<MultiLineChart labels={labels} annotations={ann} datasets={[
            { label: 'Stocks ROI', data: D.stocksRoi.slice(start).map(v => v ?? null), color: C.blue },
            { label: 'S&P 500',    data: D.spxRoi.slice(start),    color: C.orange, dashed: true },
            { label: 'Nasdaq',     data: D.nasdaqRoi.slice(start),  color: C.yellow, dashed: true },
          ]} />}
        >
          <MultiLineChart labels={labels} datasets={[
            { label: 'Stocks ROI', data: D.stocksRoi.slice(start).map(v => v ?? null), color: C.blue },
            { label: 'S&P 500',    data: D.spxRoi.slice(start),    color: C.orange, dashed: true },
            { label: 'Nasdaq',     data: D.nasdaqRoi.slice(start),  color: C.yellow, dashed: true },
          ]} />
        </ChartCard>

        <ChartCard
          label="Gain $"
          value={fmtSign$(cur.stocksGain)}
          change={fmtPct(cur.stocksRoi as number)}
          changePositive={cur.stocksGain >= 0}
          modalContent={<LineChart labels={labels} data={D.stocksGain.slice(start).map(v => v || 0)} color={C.green} fill yLabel="Gain $" />}
        >
          <LineChart labels={labels} data={D.stocksGain.slice(start).map(v => v || 0)} color={C.green} fill yLabel="Gain $" />
        </ChartCard>

        <ChartCard
          label="Monthly Invested"
          value={fmt$(cur.stocksInvested, true)}
          change="Cumulative invested"
          changePositive={null}
          modalContent={<LineChart labels={labels} data={D.stocksInvested.slice(start)} color={C.blue} yLabel="Invested $" />}
        >
          <LineChart labels={labels} data={D.stocksInvested.slice(start)} color={C.blue} yLabel="Invested $" />
        </ChartCard>
      </div>

      <div>
        <div className="section-row" style={{ marginBottom: 10 }}>
          <div className="section-title">Monthly Breakdown · Last 12 months</div>
        </div>
        <div className="data-table-wrap">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr><th>Month</th><th>Return</th><th>Invested</th><th>Gain</th><th>ROI %</th></tr>
              </thead>
              <tbody>
                {tableRows.map(r => (
                  <tr key={r.month}>
                    <td>{r.month}</td>
                    <td>{fmt$(r.return)}</td>
                    <td>{fmt$(r.invested)}</td>
                    <td className={clsROI(r.gain)}>{fmtSign$(r.gain)}</td>
                    <td className={clsROI(r.roi)}>{fmtPct(r.roi)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
