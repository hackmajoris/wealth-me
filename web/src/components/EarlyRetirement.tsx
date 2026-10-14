import { useMemo, useState } from 'react';
import type { SavingsEntry } from '../lib/storage';
import { retirementTarget, yearsToRetirement } from '../lib/retirement';
import { ChartCard } from './ChartCard';
import { YearsToRetirementChart } from './charts/YearsToRetirementChart';
import { RetirementScenario } from './RetirementScenario';

interface EarlyRetirementProps {
  /** Savings entries in chronological order (amounts in the display currency). */
  entries: SavingsEntry[];
  /** Portfolio value for a "Sep 19"-style month label, in the display currency. */
  portfolioAt: (month: string) => number | null;
  /** Current portfolio value, in the display currency. */
  currentPortfolio: number;
  fmt: (v: number | null) => string;
}

const DEFAULT_RETURN = 10;
const DEFAULT_WITHDRAWAL = 4;

/** Annualised income/expenses from the trailing (up to) 12 entries ending at `end`. */
function trailingYear(entries: SavingsEntry[], end: number) {
  const months = entries.slice(Math.max(0, end - 11), end + 1);
  const scale = 12 / months.length;
  return {
    income: months.reduce((s, e) => s + e.netIncome, 0) * scale,
    expenses: months.reduce((s, e) => s + e.totalExpenses, 0) * scale,
  };
}

const fmtYears = (y: number | null) =>
  y === null ? 'Not reachable' : y === 0 ? 'Now' : `${y.toFixed(1)} years`;

export function EarlyRetirement({
  entries,
  portfolioAt,
  currentPortfolio,
  fmt,
}: EarlyRetirementProps) {
  const fromData = useMemo(() => {
    const t = entries.length > 0 ? trailingYear(entries, entries.length - 1) : null;
    return {
      income: Math.round(t?.income ?? 0),
      expenses: Math.round(t?.expenses ?? 0),
      balance: Math.round(currentPortfolio),
    };
  }, [entries, currentPortfolio]);

  // User overrides; null means "use the value derived from data".
  const [income, setIncome] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [returnPct, setReturnPct] = useState(String(DEFAULT_RETURN));
  const [withdrawalPct, setWithdrawalPct] = useState(String(DEFAULT_WITHDRAWAL));

  const num = (v: string | null, fallback: number) => {
    const n = v === null || v.trim() === '' ? NaN : Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const inputs = {
    annualIncome: num(income, fromData.income),
    annualExpenses: num(expenses, fromData.expenses),
    balance: num(balance, fromData.balance),
    annualReturnPct: num(returnPct, DEFAULT_RETURN),
    withdrawalRatePct: num(withdrawalPct, DEFAULT_WITHDRAWAL),
  };
  const savings = inputs.annualIncome - inputs.annualExpenses;
  const savingsRate = inputs.annualIncome > 0 ? (savings / inputs.annualIncome) * 100 : null;
  const target = retirementTarget(inputs);
  const years = yearsToRetirement(inputs);
  const progress = Number.isFinite(target) && target > 0 ? (inputs.balance / target) * 100 : null;
  const retireYear = years !== null ? new Date().getFullYear() + Math.ceil(years) : null;
  const edited =
    income !== null ||
    expenses !== null ||
    balance !== null ||
    returnPct !== String(DEFAULT_RETURN) ||
    withdrawalPct !== String(DEFAULT_WITHDRAWAL);

  // History: years to retirement as of each past month, using that month's
  // trailing year and portfolio value, with the current return/withdrawal rates.
  // The first 5 months are skipped: too little data to annualise.
  const history = useMemo(() => {
    const labels: string[] = [];
    const values: (number | null)[] = [];
    entries.forEach((e, i) => {
      if (i < 5) return;
      const t = trailingYear(entries, i);
      labels.push(e.month);
      values.push(
        yearsToRetirement({
          annualIncome: t.income,
          annualExpenses: t.expenses,
          balance: portfolioAt(e.month) ?? 0,
          annualReturnPct: inputs.annualReturnPct,
          withdrawalRatePct: inputs.withdrawalRatePct,
        })
      );
    });
    return { labels, values };
  }, [entries, portfolioAt, inputs.annualReturnPct, inputs.withdrawalRatePct]);

  const firstReachable = history.values.find((v) => v !== null) ?? null;
  const change =
    years !== null && firstReachable !== null
      ? `${(firstReachable - years).toFixed(1)} years closer since ${history.labels[history.values.indexOf(firstReachable)]}`
      : undefined;

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

  return (
    <>
      <div className="chart-grid">
        <div className="chart-card" style={{ cursor: 'default' }}>
          <div className="chart-card-header">
            <span className="chart-card-label">Early Retirement Calculator</span>
            {edited && (
              <button
                className="chart-type-btn"
                onClick={() => {
                  setIncome(null);
                  setExpenses(null);
                  setBalance(null);
                  setReturnPct(String(DEFAULT_RETURN));
                  setWithdrawalPct(String(DEFAULT_WITHDRAWAL));
                }}
              >
                Reset to my data
              </button>
            )}
          </div>
          <div className="chart-card-value pos">{fmtYears(years)}</div>
          <div className="chart-card-change pos">
            {retireYear !== null && years !== 0 ? `Retire around ${retireYear}` : ' '}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            <div className="field-row">
              {field('Annual income (last 12 mo)', income, fromData.income, setIncome)}
              {field('Annual expenses (last 12 mo)', expenses, fromData.expenses, setExpenses)}
            </div>
            <div className="field-row">
              {field('Portfolio value', balance, fromData.balance, setBalance)}
              {field('Annual return %', returnPct, DEFAULT_RETURN, setReturnPct)}
            </div>
            <div className="field-row">
              {field('Withdrawal rate %', withdrawalPct, DEFAULT_WITHDRAWAL, setWithdrawalPct)}
              <div className="field">
                <label>Annual savings · rate</label>
                <div style={{ padding: '9px 0', fontSize: 13, fontFamily: 'JetBrains Mono' }}>
                  {fmt(savings)} · {savingsRate !== null ? savingsRate.toFixed(1) + '%' : '—'}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
              Target: <b>{Number.isFinite(target) ? fmt(target) : '—'}</b> (expenses ÷ withdrawal
              rate)
              {progress !== null && <> · {Math.min(progress, 999).toFixed(1)}% there</>}
            </div>
          </div>
        </div>

        <ChartCard
          label="Years to Retirement · over time"
          value={fmtYears(years)}
          change={change}
          changePositive={change ? true : null}
          modalContent={<YearsToRetirementChart labels={history.labels} years={history.values} />}
        >
          <YearsToRetirementChart labels={history.labels} years={history.values} />
        </ChartCard>
      </div>
      <RetirementScenario base={inputs} fmt={fmt} />
    </>
  );
}
