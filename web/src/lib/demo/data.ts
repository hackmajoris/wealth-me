// Demo dataset generator. Produces monthly history from Jan 2021 through the
// current month, loosely following real market regimes (2021 boom, 2022 bear,
// 2023-24 recovery). A fixed seed keeps the demo identical across reloads.

import type { Entry, SavingsEntry, Asset, Debt } from '../storage';
import type { AssetEntry, DebtEntry } from '../api';

export const MO = [
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
export const MO_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const START_YEAR = 2021;
const SEED = 20240501;

export interface DemoSettings {
  numbers: Record<string, number>;
  strings: Record<string, string>;
}

export interface DemoData {
  entries: Entry[];
  savings: SavingsEntry[];
  assets: Asset[];
  assetEntries: AssetEntry[];
  debts: Debt[];
  debtEntries: DebtEntry[];
  settings: DemoSettings;
  // Monthly closes keyed by `${symbol}|${yr}|${mo}` (mo is 1-based).
  benchmarkCloses: Record<string, number>;
}

// mulberry32: small, fast, deterministic PRNG.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rand: () => number, mean: number, sd: number): number {
  const u = Math.max(rand(), 1e-9);
  const v = rand();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const round0 = (n: number) => Math.round(n);

export function monthLabel(yr: number, moIdx: number): string {
  return `${MO[moIdx]} ${String(yr).slice(2)}`;
}

export function sqliteNow(d = new Date()): string {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

interface Month {
  yr: number;
  moIdx: number; // 0-based
}

// Monthly drift for equities and crypto, keyed to the calendar.
function stockDrift({ yr }: Month): number {
  if (yr === 2022) return -0.017;
  if (yr === 2021 || yr === 2023 || yr === 2024) return 0.017;
  return 0.01;
}

function cryptoDrift({ yr, moIdx }: Month): number {
  if (yr === 2021) return moIdx <= 9 ? 0.07 : -0.08;
  if (yr === 2022) return -0.07;
  if (yr === 2023) return 0.05;
  if (yr === 2024) return 0.045;
  return 0.005;
}

function monthsSince(yr: number, now: Date): Month[] {
  return lastMonths((now.getFullYear() - yr) * 12 + now.getMonth() + 1, now);
}

function lastMonths(n: number, now: Date): Month[] {
  const out: Month[] = [];
  const d = new Date(now.getFullYear(), now.getMonth() - (n - 1), 1);
  for (let i = 0; i < n; i++) {
    out.push({ yr: d.getFullYear(), moIdx: d.getMonth() });
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

export function generateDemoData(now = new Date()): DemoData {
  const rand = rng(SEED);
  const months = monthsSince(START_YEAR, now);
  const created = sqliteNow(now);

  // ── Investments: cumulative invested vs. current value ──────────────────────
  const entries: Entry[] = [];
  let stocksInv = 6000;
  let stocksVal = 6000;
  let cryptoInv = 2000;
  let cryptoVal = 2000;
  months.forEach((m, i) => {
    if (i > 0) {
      const stockContrib = 1000 + Math.floor(i / 12) * 200;
      stocksInv += stockContrib;
      stocksVal = (stocksVal + stockContrib) * (1 + normal(rand, stockDrift(m), 0.03));

      const cryptoContrib = rand() < 0.75 ? 400 : 0;
      cryptoInv += cryptoContrib;
      cryptoVal = Math.max(
        300,
        (cryptoVal + cryptoContrib) * (1 + normal(rand, cryptoDrift(m), 0.1))
      );
    }
    entries.push({
      id: i + 1,
      month: monthLabel(m.yr, m.moIdx),
      monthFull: `${MO_FULL[m.moIdx]} ${m.yr}`,
      yr: m.yr,
      mo: MO[m.moIdx],
      cryptoInvested: round0(cryptoInv),
      cryptoReturn: round0(cryptoVal),
      stocksInvested: round0(stocksInv),
      stocksReturn: round0(stocksVal),
      note:
        m.yr === 2022 && m.moIdx === 5
          ? 'Bear market'
          : m.yr === 2022 && m.moIdx === 10
            ? 'Crypto winter'
            : '',
      createdAt: created,
    });
  });

  // ── Savings: income with yearly raises, seasonal expenses ───────────────────
  const savingsTarget = 30;
  const savings: SavingsEntry[] = [];
  let income = 8500;
  months.forEach((m, i) => {
    if (i > 0 && m.moIdx === 0) income *= 1.06;
    const bonus = m.moIdx === 11 ? 4000 : 0;
    const netIncome = round0(income + bonus + normal(rand, 0, 250));
    const seasonal = m.moIdx === 11 ? 1.3 : m.moIdx === 7 ? 1.2 : 1;
    const totalExpenses = round0(6000 * seasonal * (1 + i * 0.004) + normal(rand, 0, 600));
    const saved = netIncome - totalExpenses;
    savings.push({
      id: i + 1,
      month: monthLabel(m.yr, m.moIdx),
      monthFull: `${MO_FULL[m.moIdx]} ${m.yr}`,
      yr: m.yr,
      mo: MO[m.moIdx],
      netIncome,
      totalExpenses,
      savings: saved,
      savingRate: round2((saved / netIncome) * 100),
      target: savingsTarget,
      note: m.moIdx === 7 ? 'Summer holiday' : m.moIdx === 11 ? 'Year-end bonus' : '',
      updatedAt: created,
    });
  });

  // ── Assets: monthly snapshots per holding ───────────────────────────────────
  const assetEntries: AssetEntry[] = [];
  let apartment = 400000;
  let car = 70000;
  let emergency = 15000;
  let gold = 8000;
  let deposit = 5000;
  months.forEach((m, i) => {
    if (i > 0) {
      apartment *= 1 + normal(rand, 0.004, 0.003);
      // Old car traded in for a new one in Mar 2024 (financed by the car loan).
      car = m.yr === 2024 && m.moIdx === 2 ? 125000 : car * 0.988;
      emergency = Math.min(45000, emergency + 400);
      gold *= 1 + normal(rand, 0.009, 0.03);
      deposit += Math.max(0, savings[i]!.savings * 0.3);
    }
    const date = monthLabel(m.yr, m.moIdx);
    const rows: [string, string, number][] = [
      ['Apartment', 'Real Estate', apartment],
      ['Car', 'Vehicle', car],
      ['Emergency fund', 'Cash / Savings', emergency],
      ['Term deposit', 'Cash / Savings', deposit],
      ['Gold', 'Investment', gold],
    ];
    for (const [name, category, amount] of rows) {
      assetEntries.push({
        id: assetEntries.length + 1,
        date,
        name,
        category,
        amount: round0(amount),
        note: '',
        createdAt: created,
      });
    }
  });

  const assets: Asset[] = [
    ['Apartment', 'Real Estate', apartment, 385000, '2020-09-15'],
    ['Car', 'Vehicle', car, 125000, '2024-03-10'],
    ['Emergency fund', 'Cash / Savings', emergency, 0, ''],
    ['Term deposit', 'Cash / Savings', deposit, 0, ''],
    ['Gold', 'Investment', gold, 7500, '2020-11-20'],
  ].map(([name, category, value, purchasePrice, purchaseDate], i) => ({
    id: i + 1,
    name: name as string,
    category: category as string,
    value: round0(value as number),
    purchasePrice: purchasePrice as number,
    purchaseDate: purchaseDate as string,
    note: '',
    createdAt: created,
    updatedAt: created,
  }));

  // ── Debts: amortizing loans plus a revolving card ───────────────────────────
  const debtEntries: DebtEntry[] = [];
  let mortgage = 340000;
  let carLoan = 0;
  months.forEach((m, i) => {
    if (i > 0) {
      mortgage = mortgage * (1 + 0.055 / 12) - 2400;
      carLoan =
        m.yr === 2024 && m.moIdx === 2 ? 60000 : Math.max(0, carLoan * (1 + 0.079 / 12) - 1900);
    }
    const date = monthLabel(m.yr, m.moIdx);
    const card = round0(Math.max(0, normal(rand, 2200, 1100)));
    const rows: [string, string, number][] = [['Mortgage', 'Mortgage', mortgage]];
    if (carLoan > 0) rows.push(['Car loan', 'Auto Loan', carLoan]);
    rows.push(['Credit card', 'Credit Card', card]);
    for (const [name, category, amount] of rows) {
      debtEntries.push({
        id: debtEntries.length + 1,
        date,
        name,
        category,
        amount: round0(amount),
        currency: 'RON',
        note: '',
        createdAt: created,
      });
    }
  });

  const debts: Debt[] = [
    ['Mortgage', 'Mortgage', mortgage, 0, 5.5, 2400],
    ['Car loan', 'Auto Loan', carLoan, 0, 7.9, 1900],
    ['Credit card', 'Credit Card', debtEntries[debtEntries.length - 1]!.amount, 15000, 21.9, 300],
  ].map(([name, category, balance, limit, interestRate, minimumPayment], i) => ({
    id: i + 1,
    name: name as string,
    category: category as string,
    balance: round0(balance as number),
    limit: limit as number,
    interestRate: interestRate as number,
    minimumPayment: minimumPayment as number,
    note: '',
    createdAt: created,
    updatedAt: created,
  }));

  // ── Benchmarks: synthetic index closes from Dec of the year before start ────
  const benchmarkCloses: Record<string, number> = {};
  const first = months[0]!;
  const benchMonths = lastMonths(
    (now.getFullYear() - (first.yr - 1)) * 12 + now.getMonth() - 11 + 1,
    now
  );
  // [symbol, Dec 2020 close, beta vs. stockDrift, sd]
  const indices: [string, number, number, number][] = [
    ['^GSPC', 3756, 0.8, 0.04],
    ['^IXIC', 12888, 1.1, 0.055],
    ['VWCE.DE', 87, 0.7, 0.035],
  ];
  for (const [sym, start, beta, sd] of indices) {
    let close = start;
    for (const bm of benchMonths) {
      benchmarkCloses[`${sym}|${bm.yr}|${bm.moIdx + 1}`] = round2(close);
      close *= 1 + normal(rand, stockDrift(bm) * beta, sd);
    }
  }

  return {
    entries,
    savings,
    assets,
    assetEntries,
    debts,
    debtEntries,
    settings: {
      numbers: {
        savings_target: savingsTarget,
        rate_usd_to_ron: 4.35,
        rate_eur_to_ron: 5.09,
      },
      strings: { currency: 'RON', assets_currency: 'RON', debts_currency: 'RON' },
    },
    benchmarkCloses,
  };
}
