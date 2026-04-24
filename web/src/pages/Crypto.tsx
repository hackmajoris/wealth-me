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

interface CryptoProps { showModal: () => void; }

export function Crypto({ showModal }: CryptoProps) {
  const [range, setRange] = useState<Range>('ALL');
  const [showEvents, setShowEvents] = useState(true);

  const { start } = sliceRange(range);
  const labels = D.months.slice(start);
  const cur = D.current;
  const ann = buildAnnotations(labels, showEvents);

  const tableStart = D.N - 12;
  const tableRows = D.months.slice(tableStart).map((m, i) => {
    const idx = tableStart + i;
    return { month: m, return: D.cryptoReturn[idx], invested: D.cryptoInvested[idx],
             gain: D.cryptoGain[idx], roi: D.cryptoRoi[idx] };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div className="page-title">Crypto <span className="page-sub" style={{ fontWeight: 400 }}>Sep 2019 – Apr 2026</span></div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="add-btn" onClick={showModal}>+ Add Entry</button>
          <TimeRange value={range} onChange={setRange} showEvents={showEvents} onToggleEvents={() => setShowEvents(v => !v)} />
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Current Value</div>
          <div className="kpi-value pos">{fmt$(cur.cryptoValue, true)}</div>
          <div className="kpi-change pos">{fmtPct(cur.cryptoRoi)} ROI</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Invested</div>
          <div className="kpi-value">{fmt$(cur.cryptoInvested, true)}</div>
          <div className="kpi-change neu">Since Sep 2019</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Gain</div>
          <div className={`kpi-value ${clsROI(cur.cryptoGain)}`}>{fmtSign$(cur.cryptoGain)}</div>
          <div className="kpi-change neu">Unrealized</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Peak ROI</div>
          <div className="kpi-value" style={{ color: C.purple }}>+350%</div>
          <div className="kpi-change neu">Nov 2024</div>
        </div>
      </div>

      <div className="chart-grid">
        <ChartCard
          label="Return vs Invested"
          value={fmt$(cur.cryptoValue, true)}
          change={fmtPct(cur.cryptoRoi)}
          changePositive={cur.cryptoRoi >= 0}
          modalContent={<AreaChart labels={labels} annotations={ann} datasets={[
            { label: 'Value',    data: D.cryptoReturn.slice(start), color: C.purple },
            { label: 'Invested', data: D.cryptoInvested.slice(start), color: C.blue },
          ]} />}
        >
          <AreaChart labels={labels} datasets={[
            { label: 'Value',    data: D.cryptoReturn.slice(start), color: C.purple },
            { label: 'Invested', data: D.cryptoInvested.slice(start), color: C.blue },
          ]} />
        </ChartCard>

        <ChartCard
          label="ROI % over Time"
          value={fmtPct(cur.cryptoRoi)}
          change="Full cycle: bear → bull → crash → recovery"
          changePositive={cur.cryptoRoi >= 0}
          modalContent={<MultiLineChart labels={labels} annotations={ann} datasets={[
            { label: 'Crypto ROI', data: D.cryptoRoi.slice(start), color: C.purple },
            { label: 'S&P 500',    data: D.spxRoi.slice(start),    color: C.orange, dashed: true },
          ]} />}
        >
          <MultiLineChart labels={labels} datasets={[
            { label: 'Crypto ROI', data: D.cryptoRoi.slice(start), color: C.purple },
            { label: 'S&P 500',    data: D.spxRoi.slice(start),    color: C.orange, dashed: true },
          ]} />
        </ChartCard>

        <ChartCard
          label="Gain $"
          value={fmtSign$(cur.cryptoGain)}
          change={fmtPct(cur.cryptoRoi)}
          changePositive={cur.cryptoGain >= 0}
          modalContent={<LineChart labels={labels} data={D.cryptoGain.slice(start)} color={cur.cryptoGain >= 0 ? C.green : C.red} fill yLabel="Gain $" />}
        >
          <LineChart labels={labels} data={D.cryptoGain.slice(start)} color={cur.cryptoGain >= 0 ? C.green : C.red} fill yLabel="Gain $" />
        </ChartCard>

        <ChartCard
          label="Cumulative Invested"
          value={fmt$(cur.cryptoInvested, true)}
          change="Total deployed into crypto"
          changePositive={null}
          modalContent={<LineChart labels={labels} data={D.cryptoInvested.slice(start)} color={C.purple} yLabel="Invested $" />}
        >
          <LineChart labels={labels} data={D.cryptoInvested.slice(start)} color={C.purple} yLabel="Invested $" />
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
