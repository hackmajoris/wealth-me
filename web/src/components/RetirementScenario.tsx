import { useState } from 'react';
import {
  balancePath,
  retirementTarget,
  yearsToRetirement,
  type RetirementInputs,
} from '../lib/retirement';
import { ScenarioPathChart } from './charts/ScenarioPathChart';

interface RetirementScenarioProps {
  /** Today's numbers, as set in the calculator. */
  base: RetirementInputs;
  fmt: (v: number | null) => string;
}

interface Scenario {
  expensesPct: number;
  incomePct: number;
  returnPct: number | null; // null: same as the calculator
  withdrawalPct: number | null;
}

const NEUTRAL: Scenario = { expensesPct: 0, incomePct: 0, returnPct: null, withdrawalPct: null };

const PRESETS: { label: string; s: Partial<Scenario> }[] = [
  { label: 'Expenses −10%', s: { expensesPct: -10 } },
  { label: 'Expenses −20%', s: { expensesPct: -20 } },
  { label: 'Income +10%', s: { incomePct: 10 } },
  { label: 'Lifestyle creep +20%', s: { expensesPct: 20 } },
  { label: 'Safer 3.5% withdrawal', s: { withdrawalPct: 3.5 } },
  { label: 'Conservative 5% return', s: { returnPct: 5 } },
];

const fmtYears = (y: number | null) => (y === null ? 'never' : `${y.toFixed(1)} yrs`);

export function RetirementScenario({ base, fmt }: RetirementScenarioProps) {
  const [sc, setSc] = useState<Scenario>(NEUTRAL);

  const scenario: RetirementInputs = {
    annualIncome: base.annualIncome * (1 + sc.incomePct / 100),
    annualExpenses: base.annualExpenses * (1 + sc.expensesPct / 100),
    balance: base.balance,
    annualReturnPct: sc.returnPct ?? base.annualReturnPct,
    withdrawalRatePct: sc.withdrawalPct ?? base.withdrawalRatePct,
  };
  const baseYears = yearsToRetirement(base);
  const scYears = yearsToRetirement(scenario);
  const baseTarget = retirementTarget(base);
  const scTarget = retirementTarget(scenario);
  const delta = baseYears !== null && scYears !== null ? scYears - baseYears : null;
  const thisYear = new Date().getFullYear();

  // Chart horizon: a bit past the later finish line, capped at 40 years.
  const horizon = Math.min(40, Math.ceil(Math.max(baseYears ?? 40, scYears ?? 40)) + 2);
  const labels = Array.from({ length: horizon + 1 }, (_, k) => String(thisYear + k));

  const slider = (
    label: string,
    value: number,
    display: string,
    min: number,
    max: number,
    step: number,
    onChange: (v: number) => void
  ) => (
    <div className="field">
      <label style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span>
        <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--text)' }}>{display}</span>
      </label>
      <input
        type="range"
        className="scenario-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );

  const sign = (v: number) => (v > 0 ? '+' : '') + v + '%';
  const isNeutral =
    sc.expensesPct === 0 &&
    sc.incomePct === 0 &&
    sc.returnPct === null &&
    sc.withdrawalPct === null;

  return (
    <div className="chart-card" style={{ cursor: 'default', marginTop: 12 }}>
      <div className="chart-card-header">
        <span className="chart-card-label">What-if scenario</span>
        {!isNeutral && (
          <button className="chart-type-btn" onClick={() => setSc(NEUTRAL)}>
            Reset
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '4px 0 14px' }}>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            className="chart-type-btn"
            onClick={() => setSc({ ...NEUTRAL, ...p.s })}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="scenario-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {slider(
            'Expenses',
            sc.expensesPct,
            `${sign(sc.expensesPct)} · ${fmt(scenario.annualExpenses)}/yr`,
            -50,
            50,
            1,
            (v) => setSc({ ...sc, expensesPct: v })
          )}
          {slider(
            'Income',
            sc.incomePct,
            `${sign(sc.incomePct)} · ${fmt(scenario.annualIncome)}/yr`,
            -30,
            50,
            1,
            (v) => setSc({ ...sc, incomePct: v })
          )}
          {slider(
            'Annual return',
            scenario.annualReturnPct,
            `${scenario.annualReturnPct}%`,
            0,
            12,
            0.5,
            (v) => setSc({ ...sc, returnPct: v })
          )}
          {slider(
            'Withdrawal rate',
            scenario.withdrawalRatePct,
            `${scenario.withdrawalRatePct}%`,
            2.5,
            6,
            0.25,
            (v) => setSc({ ...sc, withdrawalPct: v })
          )}

          <div className="scenario-result">
            <div>
              <div className="kpi-label">Today</div>
              <div className="scenario-num">{fmtYears(baseYears)}</div>
              <div className="scenario-sub">
                {baseYears !== null ? `retire ~${thisYear + Math.ceil(baseYears)}` : '—'} · target{' '}
                {fmt(baseTarget)}
              </div>
            </div>
            <div>
              <div className="kpi-label">Scenario</div>
              <div className={`scenario-num ${delta === null ? '' : delta <= 0 ? 'pos' : 'neg'}`}>
                {fmtYears(scYears)}
              </div>
              <div className="scenario-sub">
                {scYears !== null ? `retire ~${thisYear + Math.ceil(scYears)}` : '—'} · target{' '}
                {fmt(scTarget)}
              </div>
            </div>
            <div>
              <div className="kpi-label">Difference</div>
              <div
                className={`scenario-num ${delta === null || delta === 0 ? '' : delta < 0 ? 'pos' : 'neg'}`}
              >
                {delta === null
                  ? '—'
                  : `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${Math.abs(delta).toFixed(1)} yrs`}
              </div>
              <div className="scenario-sub">
                savings {fmt(scenario.annualIncome - scenario.annualExpenses)}/yr
              </div>
            </div>
          </div>
        </div>

        <div className="scenario-chart">
          <ScenarioPathChart
            labels={labels}
            base={balancePath(base, horizon)}
            scenario={balancePath(scenario, horizon)}
            baseTarget={Number.isFinite(baseTarget) ? baseTarget : NaN}
            scenarioTarget={Number.isFinite(scTarget) ? scTarget : NaN}
            fmt={fmt}
          />
        </div>
      </div>
    </div>
  );
}
