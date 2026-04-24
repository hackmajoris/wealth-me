// wealth-me sample data — Sep 2019 → Apr 2026 (80 months)

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

interface Keyframe { idx: number; val: number; }

function interp(keyframes: Keyframe[], n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const lo = [...keyframes].reverse().find(k => k.idx <= i) ?? keyframes[0];
    const hi = keyframes.find(k => k.idx >= i) ?? keyframes[keyframes.length - 1];
    if (lo === hi) { out.push(lo.val); continue; }
    const t = (i - lo.idx) / (hi.idx - lo.idx);
    out.push(Math.round(lerp(lo.val, hi.val, t) * 100) / 100);
  }
  return out;
}

const N = 80;
const months: string[] = [];
const monthsFull: Date[] = [];
const d = new Date(2019, 8); // Sep 2019
for (let i = 0; i < N; i++) {
  months.push(d.toLocaleString('en-US', { month: 'short', year: '2-digit' }));
  monthsFull.push(new Date(d));
  d.setMonth(d.getMonth() + 1);
}

const cryptoInvested = interp([
  {idx:0,val:2452},{idx:1,val:2712},{idx:4,val:3233},
  {idx:9,val:15000},{idx:15,val:17000},{idx:20,val:18500},
  {idx:27,val:20000},{idx:36,val:22000},{idx:45,val:25000},
  {idx:54,val:28000},{idx:63,val:31000},{idx:72,val:34000},
  {idx:79,val:36000},
], N);

const cryptoRoi = interp([
  {idx:0,val:-30},{idx:2,val:-35},{idx:4,val:3},
  {idx:6,val:-29},{idx:9,val:8},{idx:12,val:35},
  {idx:15,val:65},{idx:18,val:120},{idx:20,val:145},
  {idx:22,val:250},{idx:24,val:280},{idx:27,val:195},
  {idx:30,val:80},{idx:33,val:-15},{idx:36,val:-45},
  {idx:38,val:-55},{idx:39,val:-50},{idx:42,val:-30},
  {idx:45,val:5},{idx:48,val:55},{idx:51,val:90},
  {idx:54,val:130},{idx:57,val:180},{idx:60,val:290},
  {idx:63,val:310},{idx:65,val:260},{idx:67,val:330},
  {idx:69,val:350},{idx:72,val:285},{idx:75,val:240},
  {idx:78,val:210},{idx:79,val:215},
], N);

const stocksInvestedRaw = interp([
  {idx:0,val:0},{idx:8,val:0},
  {idx:9,val:12321},{idx:10,val:14430},{idx:14,val:16000},
  {idx:18,val:20000},{idx:24,val:25000},{idx:30,val:30000},
  {idx:36,val:36000},{idx:42,val:40000},{idx:48,val:44000},
  {idx:54,val:48000},{idx:60,val:52000},{idx:66,val:55000},
  {idx:72,val:58000},{idx:79,val:62000},
], N);
const stocksInvested = stocksInvestedRaw.map((v, i) => i < 9 ? 0 : v);

const stocksRoiRaw = interp([
  {idx:9,val:0},{idx:12,val:26},{idx:15,val:65},
  {idx:18,val:120},{idx:21,val:145},{idx:24,val:135},
  {idx:27,val:115},{idx:30,val:75},{idx:33,val:25},
  {idx:36,val:-10},{idx:39,val:-18},{idx:42,val:-8},
  {idx:45,val:18},{idx:48,val:48},{idx:51,val:78},
  {idx:54,val:105},{idx:57,val:122},{idx:60,val:145},
  {idx:63,val:155},{idx:66,val:142},{idx:69,val:160},
  {idx:72,val:175},{idx:75,val:160},{idx:79,val:168},
], N);
const stocksRoi: (number | null)[] = stocksRoiRaw.map((v, i) => i < 9 ? null : v);

const spxRoi = interp([
  {idx:0,val:0},{idx:3,val:5},{idx:6,val:-18},
  {idx:9,val:10},{idx:12,val:22},{idx:15,val:30},
  {idx:18,val:45},{idx:21,val:52},{idx:24,val:42},
  {idx:27,val:55},{idx:30,val:32},{idx:33,val:12},
  {idx:36,val:8},{idx:39,val:-5},{idx:42,val:0},
  {idx:45,val:12},{idx:48,val:28},{idx:51,val:42},
  {idx:54,val:58},{idx:57,val:72},{idx:60,val:88},
  {idx:63,val:92},{idx:66,val:82},{idx:69,val:95},
  {idx:72,val:108},{idx:75,val:98},{idx:79,val:105},
], N);

const nasdaqRoi = interp([
  {idx:0,val:0},{idx:6,val:-15},{idx:9,val:15},
  {idx:12,val:30},{idx:15,val:42},{idx:18,val:62},
  {idx:21,val:72},{idx:24,val:55},{idx:27,val:68},
  {idx:30,val:40},{idx:33,val:10},{idx:36,val:-5},
  {idx:39,val:-15},{idx:42,val:-2},{idx:45,val:20},
  {idx:48,val:45},{idx:51,val:68},{idx:54,val:92},
  {idx:57,val:110},{idx:60,val:132},{idx:63,val:138},
  {idx:66,val:120},{idx:69,val:145},{idx:72,val:162},
  {idx:75,val:148},{idx:79,val:158},
], N);

const cryptoReturn = cryptoInvested.map((inv, i) => Math.round(inv * (1 + cryptoRoi[i] / 100)));
const cryptoGain   = cryptoReturn.map((ret, i) => ret - cryptoInvested[i]);

const stocksReturn = stocksInvested.map((inv, i) =>
  stocksRoi[i] === null ? 0 : Math.round(inv * (1 + (stocksRoi[i] as number) / 100)));
const stocksGain = stocksReturn.map((ret, i) => ret - stocksInvested[i]);

const totalInvested = cryptoInvested.map((c, i) => c + stocksInvested[i]);
const totalReturn   = cryptoReturn.map((c, i) => c + stocksReturn[i]);
const totalGain     = totalReturn.map((r, i) => r - totalInvested[i]);
const totalRoi      = totalInvested.map((inv, i) =>
  inv > 0 ? Math.round((totalGain[i] / inv) * 1000) / 10 : 0);

const cryptoAlloc = totalInvested.map((t, i) =>
  t > 0 ? Math.round((cryptoInvested[i] / t) * 100) : 100);
const stocksAlloc = cryptoAlloc.map(c => 100 - c);

const monthlyTotalInvested = totalInvested.map((v, i) =>
  i === 0 ? v : Math.max(0, v - totalInvested[i - 1]));

const latest = N - 1;
const current = {
  portfolioValue: totalReturn[latest],
  totalInvested:  totalInvested[latest],
  totalGain:      totalGain[latest],
  totalRoi:       totalRoi[latest],
  cryptoValue:    cryptoReturn[latest],
  cryptoInvested: cryptoInvested[latest],
  cryptoGain:     cryptoGain[latest],
  cryptoRoi:      cryptoRoi[latest],
  stocksValue:    stocksReturn[latest],
  stocksInvested: stocksInvested[latest],
  stocksGain:     stocksGain[latest],
  stocksRoi:      stocksRoi[latest],
};

const YEARS_LIST = [2019,2020,2021,2022,2023,2024,2025,2026];
const annualStats = YEARS_LIST.map(yr => {
  const idxs = monthsFull.reduce<number[]>((a, date, i) => {
    if (date.getFullYear() === yr) a.push(i);
    return a;
  }, []);
  if (!idxs.length) return null;
  const li = idxs[idxs.length - 1];
  const newInv = idxs.reduce((s, i) => s + (monthlyTotalInvested[i] ?? 0), 0);
  return {
    year: yr, months: idxs.length,
    portfolioRoi:   Math.round(totalRoi[li] * 10) / 10,
    cryptoRoi:      Math.round(cryptoRoi[li] * 10) / 10,
    stocksRoi:      stocksRoi[li] !== null ? Math.round((stocksRoi[li] as number) * 10) / 10 : null,
    spxRoi:         Math.round(spxRoi[li] * 10) / 10,
    nasdaqRoi:      Math.round(nasdaqRoi[li] * 10) / 10,
    portfolioValue: totalReturn[li],
    gain:           totalGain[li],
    invested:       totalInvested[li],
    newInvested:    Math.round(newInv),
    monthlyAvg:     Math.round(newInv / idxs.length),
    yoyChange:      null as number | null,
  };
}).filter((s): s is NonNullable<typeof s> => s !== null);

annualStats.forEach((y, i) => {
  if (i > 0) y.yoyChange = Math.round((y.portfolioRoi - annualStats[i-1].portfolioRoi) * 10) / 10;
});

export const WealthData = {
  N, months, monthsFull,
  cryptoInvested, cryptoReturn, cryptoGain, cryptoRoi,
  stocksInvested, stocksReturn, stocksGain, stocksRoi,
  totalInvested, totalReturn, totalGain, totalRoi,
  spxRoi, nasdaqRoi,
  cryptoAlloc, stocksAlloc,
  monthlyTotalInvested,
  current,
  annualStats,
};
