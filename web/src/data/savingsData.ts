import { WealthData } from './wealthData';

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

interface Keyframe { idx: number; val: number; }

function interp(kf: Keyframe[], n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const lo = [...kf].reverse().find(k => k.idx <= i) ?? kf[0];
    const hi = kf.find(k => k.idx >= i) ?? kf[kf.length - 1];
    if (lo === hi) { out.push(lo.val); continue; }
    out.push(Math.round(lerp(lo.val, hi.val, (i - lo.idx) / (hi.idx - lo.idx))));
  }
  return out;
}

const { N, months, monthsFull } = WealthData;

const incomeBase = interp([
  {idx:0,val:4500},{idx:12,val:5000},{idx:20,val:5400},
  {idx:27,val:6000},{idx:36,val:6500},{idx:42,val:7000},
  {idx:48,val:7500},{idx:54,val:8000},{idx:60,val:8400},
  {idx:66,val:8800},{idx:72,val:9200},{idx:79,val:9500},
], N);

const netIncome = incomeBase.map((v, i) => {
  const bonus = (i % 12 === 11) ? Math.round(v * 0.5) : 0;
  const noise = Math.round(v * (Math.random() - 0.5) * 0.06);
  return v + noise + bonus;
});

const yearTargets: Record<number, number> = {
  2019:20, 2020:22, 2021:25, 2022:25,
  2023:30, 2024:35, 2025:35, 2026:40,
};

const rateBase = interp([
  {idx:0,val:16},{idx:6,val:18},{idx:12,val:20},
  {idx:18,val:23},{idx:24,val:21},{idx:27,val:26},
  {idx:33,val:24},{idx:36,val:22},{idx:39,val:25},
  {idx:42,val:28},{idx:48,val:32},{idx:51,val:35},
  {idx:54,val:33},{idx:57,val:36},{idx:60,val:38},
  {idx:63,val:36},{idx:66,val:40},{idx:69,val:38},
  {idx:72,val:42},{idx:75,val:40},{idx:79,val:44},
], N);

const savingRate = rateBase.map(r => {
  const noise = (Math.random() - 0.5) * 8;
  return Math.max(0, Math.min(70, Math.round((r + noise) * 10) / 10));
});

const savings      = netIncome.map((inc, i) => Math.round(inc * savingRate[i] / 100));
const totalExpenses = netIncome.map((inc, i) => inc - savings[i]);

const cumulativeSavings = savings.reduce<number[]>((acc, v) => {
  acc.push((acc.length ? acc[acc.length - 1] : 0) + v);
  return acc;
}, []);

const targetRate = monthsFull.map(d => yearTargets[d.getFullYear()] ?? 30);

const YEARS = [2019,2020,2021,2022,2023,2024,2025,2026];
const annualSavings = YEARS.map(yr => {
  const idxs = monthsFull.reduce<number[]>((a, d, i) => {
    if (d.getFullYear() === yr) a.push(i);
    return a;
  }, []);
  if (!idxs.length) return null;
  const totalInc  = idxs.reduce((s, i) => s + netIncome[i], 0);
  const totalExp  = idxs.reduce((s, i) => s + totalExpenses[i], 0);
  const totalSav  = idxs.reduce((s, i) => s + savings[i], 0);
  const avgRate   = Math.round((totalSav / totalInc * 100) * 10) / 10;
  const target    = yearTargets[yr] ?? 30;
  const vsTarget  = Math.round((avgRate - target) * 10) / 10;
  const monthlyAvgInc = Math.round(totalInc / idxs.length);
  const monthlyAvgSav = Math.round(totalSav / idxs.length);
  return { year: yr, months: idxs.length, totalInc, totalExp, totalSav,
           avgRate, target, vsTarget, monthlyAvgInc, monthlyAvgSav };
}).filter((s): s is NonNullable<typeof s> => s !== null);

const li = N - 1;
const current = {
  netIncome:     netIncome[li],
  totalExpenses: totalExpenses[li],
  savings:       savings[li],
  savingRate:    savingRate[li],
  targetRate:    targetRate[li],
  cumulative:    cumulativeSavings[li],
};

export const SavingsData = {
  N, months, monthsFull,
  netIncome, totalExpenses, savings, savingRate,
  targetRate, cumulativeSavings,
  annualSavings, current,
  yearTargets,
};
