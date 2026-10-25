import { useState, useMemo, Fragment } from 'react';
import { useStocks, useCrypto, useBenchmarks } from '../lib/queries';
import { ChartCard } from '../components/ChartCard';
import { TimeRange } from '../components/TimeRange';
import { AreaChart } from '../components/charts/AreaChart';
import { MultiLineChart } from '../components/charts/MultiLineChart';
import { GroupedBarChart } from '../components/charts/GroupedBarChart';
import { YoYBarChart } from '../components/charts/YoYBarChart';
import { DonutChart } from '../components/charts/DonutChart';
import { fmt$, fmtPct, fmtPts, fmtSign$k, clsROI } from '../lib/formatters';
import { sliceRange, type Range } from '../lib/ranges';
import { buildAnnotations, C } from '../lib/chartDefaults';
import { groupByYear } from '../lib/groupByYear';
import {
  benchmarkLookup,
  monthlyReturns,
  simulateDeposits,
  type BenchmarkKey,
} from '../lib/benchmarks';
import { YearToggle } from '../components/YearToggle';

interface PerformanceProps {
  showModal: () => void;
}

interface AnnualStat {
  year: number;
  months: number;
  portfolioRoi: number;
  portfolioTwr: number | null;
  gainOnCapital: number | null;
  yoyChange: number | null;
  cryptoRoi: number;
  stocksRoi: number;
  spxRoi: number | null;
  nasdaqRoi: number | null;
  vwceRoi: number | null;
  indexAvg: number | null;
  indexMixValue: number | null;
  newInvested: number;
  monthlyAvg: number;
  portfolioValue: number;
  gain: number;
  totalInvested: number;
}

// Benchmarks compared against Portfolio TWR in the heatmap.
const BENCHMARKS = [
  { key: 'spxRoi' as const, label: 'S&P 500', short: 'S&P' },
  { key: 'nasdaqRoi' as const, label: 'Nasdaq', short: 'NDQ' },
  { key: 'vwceRoi' as const, label: 'VWCE', short: 'VWCE' },
];

const annualRows = [
  {
    key: 'portfolioRoi' as const,
    label: 'Portfolio ROI',
    fmt: (v: number | null) => (v !== null ? (v >= 0 ? '+' : '') + v.toFixed(1) + '%' : '—'),
    type: 'pct',
    tooltip: '(Year Gain / Start of Year Portfolio Return) × 100',
  },
  {
    key: 'portfolioTwr' as const,
    label: 'Portfolio TWR',
    fmt: (v: number | null) => (v !== null ? (v >= 0 ? '+' : '') + v.toFixed(1) + '%' : '—'),
    type: 'pct',
    tooltip:
      'Time-weighted return: monthly returns with new money removed, chained over the year. Comparable with the indices.',
  },
  {
    key: 'gainOnCapital' as const,
    label: 'Gain / Capital',
    fmt: (v: number | null) => (v !== null ? (v >= 0 ? '+' : '') + v.toFixed(1) + '%' : '—'),
    type: 'pct',
    tooltip: 'Year Gain / (Previous Year-End Value + New Invested) × 100',
  },
  {
    key: 'yoyChange' as const,
    label: 'YoY Δ',
    fmt: (v: number | null) => (v !== null ? (v >= 0 ? '+' : '') + v.toFixed(1) + '%' : '—'),
    type: 'pct',
    tooltip: 'Current Year Portfolio ROI - Previous Year Portfolio ROI',
  },
  {
    key: 'cryptoRoi' as const,
    label: 'Crypto ROI',
    fmt: (v: number | null) => (v !== null ? (v >= 0 ? '+' : '') + v.toFixed(1) + '%' : '—'),
    type: 'pct',
    tooltip: '(Crypto Year Gain / Start of Year Crypto Return) × 100',
  },
  {
    key: 'stocksRoi' as const,
    label: 'Stocks ROI',
    fmt: (v: number | null) => (v !== null ? (v >= 0 ? '+' : '') + v.toFixed(1) + '%' : '—'),
    type: 'pct',
    tooltip: '(Stocks Year Gain / Start of Year Stocks Return) × 100',
  },
  {
    key: 'spxRoi' as const,
    label: 'S&P 500',
    fmt: (v: number | null) => (v !== null ? (v >= 0 ? '+' : '') + v.toFixed(1) + '%' : '—'),
    type: 'pct',
    tooltip: 'S&P 500 index benchmark performance for the period',
  },
  {
    key: 'nasdaqRoi' as const,
    label: 'Nasdaq',
    fmt: (v: number | null) => (v !== null ? (v >= 0 ? '+' : '') + v.toFixed(1) + '%' : '—'),
    type: 'pct',
    tooltip: 'Nasdaq index benchmark performance for the period',
  },
  {
    key: 'vwceRoi' as const,
    label: 'VWCE',
    fmt: (v: number | null) => (v !== null ? (v >= 0 ? '+' : '') + v.toFixed(1) + '%' : '—'),
    type: 'pct',
    tooltip: 'Vanguard FTSE All-World (VWCE.DE, EUR) benchmark performance for the period',
  },
  {
    key: 'indexAvg' as const,
    label: 'Index Avg',
    fmt: (v: number | null) => (v !== null ? (v >= 0 ? '+' : '') + v.toFixed(1) + '%' : '—'),
    type: 'pct',
    tooltip: 'Average yearly return of S&P 500, Nasdaq and VWCE',
  },
  {
    key: 'newInvested' as const,
    label: 'New Invested',
    fmt: (v: number | null) => (v != null && v > 0 ? '$' + v.toLocaleString() : '$0'),
    type: 'neu',
    tooltip: 'Sum of monthly investment increases throughout the year',
  },
  {
    key: 'monthlyAvg' as const,
    label: 'Monthly Avg',
    fmt: (v: number | null) => (v != null && v > 0 ? '$' + v.toLocaleString() : '$0'),
    type: 'neu',
    tooltip: 'Total New Invested / Number of months in year',
  },
  {
    key: 'portfolioValue' as const,
    label: 'Portfolio Value',
    fmt: (v: number | null) => (v != null ? '$' + (v / 1000).toFixed(1) + 'k' : '—'),
    type: 'pos',
    tooltip: 'Total portfolio value at year end = Stocks Value + Crypto Value',
  },
  {
    key: 'indexMixValue' as const,
    label: 'If in Index Avg',
    fmt: (v: number | null) => (v != null ? '$' + (v / 1000).toFixed(1) + 'k' : '—'),
    type: 'neu',
    tooltip:
      'Value at year end if every deposit had gone into an equal mix of S&P 500, Nasdaq and VWCE instead. "you vs index" is your gap in $ and in ROI points (negative = the index mix did better).',
  },
  {
    key: 'gain' as const,
    label: 'Total Gain',
    fmt: (v: number | null) =>
      v != null ? (v >= 0 ? '+$' : '-$') + Math.abs(Math.round(v)).toLocaleString() : '—',
    type: 'pct',
    tooltip: 'Year Gain = (Stocks Gain) + (Crypto Gain)',
  },
];

function heatColor(val: number | null, type: string): string {
  if (type === 'neu' || type === 'pos' || val === null) return 'transparent';
  const pct = Math.max(-100, Math.min(100, val));
  const greenShades = [
    'rgba(52,211,153,0.08)', // 0–20%
    'rgba(52,211,153,0.1)', // 20–40%
    'rgba(52,211,153,0.12)', // 40–60%
    'rgba(52,211,153,0.14)', // 60–80%
    'rgba(52,211,153,0.16)', // 80–100%
  ];
  const redShades = [
    'rgba(248,113,113,0.08)', // 0 to -20%
    'rgba(248,113,113,0.1)', // -20 to -40%
    'rgba(248,113,113,0.12)', // -40 to -60%
    'rgba(248,113,113,0.14)', // -60 to -80%
    'rgba(248,113,113,0.16)', // -80 to -100%
  ];
  if (val >= 0) return greenShades[Math.floor(pct / 20)];
  return redShades[Math.floor(Math.abs(pct) / 20)];
}

export function Performance({ showModal }: PerformanceProps) {
  const [range, setRange] = useState<Range>('ALL');
  const [showEvents, setShowEvents] = useState(true);
  const { data: stockData, isLoading: stocksLoading, error: stocksError } = useStocks();
  const { data: cryptoData, isLoading: cryptoLoading, error: cryptoError } = useCrypto();
  const { data: benchmarkData, isLoading: benchLoading } = useBenchmarks();

  const loading = stocksLoading || cryptoLoading || benchLoading;
  const error = stocksError?.message ?? cryptoError?.message ?? null;

  const [portfolioValueType, setPortfolioValueType] = useState<'area' | 'bar'>('area');
  const [roiBenchmarkType, setRoiBenchmarkType] = useState<'line' | 'bar'>('line');
  const [cryptoVsStocksType, setCryptoVsStocksType] = useState<'line' | 'bar'>('line');
  const [allocationType, setAllocationType] = useState<'line' | 'area' | 'bar'>('line');
  const [monthlyInvestedType, setMonthlyInvestedType] = useState<'bar' | 'line'>('bar');
  const [showMonthlyTrend, setShowMonthlyTrend] = useState(false);
  const [portGrouping, setPortGrouping] = useState<'month' | 'year'>('month');
  const [roiGrouping, setRoiGrouping] = useState<'month' | 'year'>('month');
  const [cryptoStocksGrouping, setCryptoStocksGrouping] = useState<'month' | 'year'>('month');
  const [allocGrouping, setAllocGrouping] = useState<'month' | 'year'>('month');
  const [invAllocGrouping, setInvAllocGrouping] = useState<'month' | 'year'>('month');
  const [focusYear, setFocusYear] = useState<number | null>(null);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [tooltipData, setTooltipData] = useState<{ text: string; x: number; y: number } | null>(
    null
  );

  const stocks = stockData ?? {
    months: [],
    invested: [],
    return: [],
    gain: [],
    roi: [],
    allocation: [],
    currentValue: 0,
    totalRoi: null,
  };
  const crypto = cryptoData ?? {
    months: [],
    invested: [],
    return: [],
    gain: [],
    roi: [],
    allocation: [],
    currentValue: 0,
    totalRoi: null,
  };

  // Merge months and align data, ensure chronological order
  const monthSet = new Set([...stocks.months, ...crypto.months]);
  const allMonths = Array.from(monthSet);
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

  // Sort months chronologically
  allMonths.sort((a, b) => {
    const aParts = a.split(' ');
    const bParts = b.split(' ');

    const aYear = parseInt(aParts[1] || '0');
    const bYear = parseInt(bParts[1] || '0');

    if (aYear !== bYear) return aYear - bYear;

    const aMoIdx = MO_ORDER[aParts[0]] ?? -1;
    const bMoIdx = MO_ORDER[bParts[0]] ?? -1;
    return aMoIdx - bMoIdx;
  });

  const months = allMonths.length > 0 ? allMonths : [];

  // Calculate combined metrics
  const combinedReturn = months.map((m) => {
    const si = stocks.months.indexOf(m);
    const ci = crypto.months.indexOf(m);
    const sr = si >= 0 ? stocks.return[si] : 0;
    const cr = ci >= 0 ? crypto.return[ci] : 0;
    return sr + cr;
  });

  const combinedInvested = months.map((m) => {
    const si = stocks.months.indexOf(m);
    const ci = crypto.months.indexOf(m);
    const si2 = si >= 0 ? stocks.invested[si] : 0;
    const ci2 = ci >= 0 ? crypto.invested[ci] : 0;
    return si2 + ci2;
  });

  const currentCombinedValue =
    combinedReturn.length > 0 ? combinedReturn[combinedReturn.length - 1] : 0;
  const currentCombinedInvested =
    combinedInvested.length > 0 ? combinedInvested[combinedInvested.length - 1] : 0;
  const currentCombinedGain = currentCombinedValue - currentCombinedInvested;
  const currentCombinedRoi =
    currentCombinedInvested > 0 ? (currentCombinedGain / currentCombinedInvested) * 100 : 0;

  // ROI you would have now if the same deposits had gone into each index instead.
  const benchmarkCards: { key: BenchmarkKey; label: string }[] = [
    { key: 'spxRoi', label: 'S&P 500' },
    { key: 'nasdaqRoi', label: 'Nasdaq' },
    { key: 'vwceRoi', label: 'VWCE' },
  ];
  const depositMonths = months.map((m, i) => ({ month: m, invested: combinedInvested[i] }));
  const indexRoiNow = Object.fromEntries(
    benchmarkCards.map(({ key }) => {
      const returns = monthlyReturns(benchmarkData, [key]);
      if (returns.size === 0 || currentCombinedInvested <= 0) return [key, null];
      const values = simulateDeposits(depositMonths, returns);
      const final = values[values.length - 1] ?? 0;
      return [key, ((final - currentCombinedInvested) / currentCombinedInvested) * 100];
    })
  ) as Record<BenchmarkKey, number | null>;

  const { start } = sliceRange(range, months.length);
  const labels = months.slice(start);
  const ann = buildAnnotations(labels, showEvents);

  // Get the last month's values for display
  const lastLabel = labels.length > 0 ? labels[labels.length - 1] : null;
  const displayCryptoValue = lastLabel
    ? (() => {
        const ci = crypto.months.indexOf(lastLabel);
        return ci >= 0 ? crypto.return[ci] : 0;
      })()
    : 0;
  const displayStocksValue = lastLabel
    ? (() => {
        const si = stocks.months.indexOf(lastLabel);
        return si >= 0 ? stocks.return[si] : 0;
      })()
    : 0;

  // Calculate allocation based on last month's invested amounts
  const lastCryptoInvested = lastLabel
    ? (() => {
        const ci = crypto.months.indexOf(lastLabel);
        return ci >= 0 ? crypto.invested[ci] : 0;
      })()
    : 0;
  const lastStocksInvested = lastLabel
    ? (() => {
        const si = stocks.months.indexOf(lastLabel);
        return si >= 0 ? stocks.invested[si] : 0;
      })()
    : 0;
  const totalInvestedForAlloc = lastCryptoInvested + lastStocksInvested;
  const displayCryptoAlloc =
    totalInvestedForAlloc > 0 ? Math.round((lastCryptoInvested / totalInvestedForAlloc) * 100) : 0;
  const displayStocksAlloc =
    totalInvestedForAlloc > 0 ? Math.round((lastStocksInvested / totalInvestedForAlloc) * 100) : 0;

  // Calculate monthly invested amounts (difference from previous month)
  const monthlyInvestedCrypto = months.map((m, i) => {
    const ci = crypto.months.indexOf(m);
    if (ci < 0) return 0;
    if (i === 0) return crypto.invested[ci];
    const prevM = months[i - 1];
    const prevCi = crypto.months.indexOf(prevM);
    if (prevCi < 0) return crypto.invested[ci];
    return Math.max(0, Math.round(crypto.invested[ci] - crypto.invested[prevCi]));
  });

  const monthlyInvestedStocks = months.map((m, i) => {
    const si = stocks.months.indexOf(m);
    if (si < 0) return 0;
    if (i === 0) return stocks.invested[si];
    const prevM = months[i - 1];
    const prevSi = stocks.months.indexOf(prevM);
    if (prevSi < 0) return stocks.invested[si];
    return Math.max(0, Math.round(stocks.invested[si] - stocks.invested[prevSi]));
  });

  const totalMonthlyInvestedCrypto = monthlyInvestedCrypto.slice(start).reduce((a, b) => a + b, 0);
  const totalMonthlyInvestedStocks = monthlyInvestedStocks.slice(start).reduce((a, b) => a + b, 0);

  // Calculate median for monthly invested
  const calculateMedian = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  const monthlyInvestedCryptoSliced = monthlyInvestedCrypto.slice(start);
  const monthlyInvestedStocksSliced = monthlyInvestedStocks.slice(start);
  const medianMonthlyCrypto = Math.round(calculateMedian(monthlyInvestedCryptoSliced));
  const medianMonthlyStocks = Math.round(calculateMedian(monthlyInvestedStocksSliced));
  const currentMonthCrypto =
    monthlyInvestedCryptoSliced[monthlyInvestedCryptoSliced.length - 1] || 0;
  const currentMonthStocks =
    monthlyInvestedStocksSliced[monthlyInvestedStocksSliced.length - 1] || 0;

  // Calculate annual stats (same as Annual.tsx)
  const stats = useMemo(() => {
    const MO_ORDER_ANNUAL: Record<string, number> = {
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

    // Group months by year
    const yearMap = new Map<
      number,
      { month: string; sReturn: number; sInv: number; cReturn: number; cInv: number }[]
    >();
    const allMonthsForYears: string[] = Array.from(new Set([...stocks.months, ...crypto.months]));

    for (const monthStr of allMonthsForYears) {
      const parts = monthStr.split(' ');
      const yearStr = parts[parts.length - 1];
      const year = parseInt(yearStr);
      if (!yearMap.has(year)) yearMap.set(year, []);

      const si = stocks.months.indexOf(monthStr);
      const ci = crypto.months.indexOf(monthStr);
      const arr = yearMap.get(year);
      if (arr) {
        arr.push({
          month: monthStr,
          sReturn: si >= 0 ? stocks.return[si] : 0,
          sInv: si >= 0 ? stocks.invested[si] : 0,
          cReturn: ci >= 0 ? crypto.return[ci] : 0,
          cInv: ci >= 0 ? crypto.invested[ci] : 0,
        });
      }
    }

    // Sort each year's months chronologically up front: the per-year pass below
    // reads the previous year's last month.
    for (const arr of yearMap.values()) {
      arr.sort(
        (a, b) =>
          (MO_ORDER_ANNUAL[a.month.split(' ')[0]] ?? -1) -
          (MO_ORDER_ANNUAL[b.month.split(' ')[0]] ?? -1)
      );
    }

    // Index-mix simulation: replay the actual monthly deposits into an equal-weight
    // mix of the benchmarks and record the value at each year end.
    const mixReturn = monthlyReturns(benchmarkData, ['spxRoi', 'nasdaqRoi', 'vwceRoi']);
    const mixValueByYear = new Map<number, number>();
    if (mixReturn.size > 0) {
      const ascYears = Array.from(yearMap.keys()).sort((a, b) => a - b);
      const flat = ascYears.flatMap((y) =>
        yearMap.get(y)!.map((m) => ({ year: y, month: m.month, invested: m.sInv + m.cInv }))
      );
      const values = simulateDeposits(flat, mixReturn);
      flat.forEach((m, i) => mixValueByYear.set(m.year, values[i]));
    }

    // Sort years (newest first)
    const years = Array.from(yearMap.keys()).sort((a, b) => b - a);
    const annualStats = years.map((year) => {
      const yearData = yearMap.get(year)!;

      // Get the last month entry for that year
      const lastMonth = yearData[yearData.length - 1];

      // Get previous year's last month for gain calculation
      const prevYear = year - 1;
      const prevYearData = yearMap.get(prevYear);
      const prevYearLastMonth = prevYearData ? prevYearData[prevYearData.length - 1] : null;

      // Calculate YTD new invested (sum of monthly increments)
      let ytdNewInvestedStocks = 0;
      let ytdNewInvestedCrypto = 0;
      let prevSInv = prevYearLastMonth?.sInv ?? 0;
      let prevCInv = prevYearLastMonth?.cInv ?? 0;

      for (const month of yearData) {
        ytdNewInvestedStocks += Math.max(0, month.sInv - prevSInv);
        ytdNewInvestedCrypto += Math.max(0, month.cInv - prevCInv);
        prevSInv = month.sInv;
        prevCInv = month.cInv;
      }

      // Calculate YTD gain (current year return - previous year return)
      const prevYearSGain = prevYearLastMonth
        ? prevYearLastMonth.sReturn - prevYearLastMonth.sInv
        : 0;
      const prevYearCGain = prevYearLastMonth
        ? prevYearLastMonth.cReturn - prevYearLastMonth.cInv
        : 0;
      const ytdSGain = lastMonth.sReturn - lastMonth.sInv - prevYearSGain;
      const ytdCGain = lastMonth.cReturn - lastMonth.cInv - prevYearCGain;

      // Average return on capital
      const firstMonth = yearData[0];
      const startOfYearStocksReturn = firstMonth.sReturn;
      const startOfYearCryptoReturn = firstMonth.cReturn;

      const stocksRoi =
        startOfYearStocksReturn > 0
          ? Math.round((ytdSGain / startOfYearStocksReturn) * 1000) / 10
          : 0;
      const cryptoRoi =
        startOfYearCryptoReturn > 0
          ? Math.round((ytdCGain / startOfYearCryptoReturn) * 1000) / 10
          : 0;

      // Portfolio ROI
      const totalYtdGain = ytdSGain + ytdCGain;
      const startOfYearPortfolioReturn = firstMonth.sReturn + firstMonth.cReturn;
      const portfolioRoi =
        startOfYearPortfolioReturn > 0
          ? Math.round((totalYtdGain / startOfYearPortfolioReturn) * 1000) / 10
          : 0;

      // Time-weighted return: chain monthly returns with net new money removed.
      // Flows are assumed mid-month (Modified Dietz), which keeps a large deposit
      // into a tiny portfolio from producing absurd monthly returns.
      let twrGrowth = 1;
      let twrMonths = 0;
      let prev = prevYearLastMonth;
      for (const m of yearData) {
        if (prev) {
          const vPrev = prev.sReturn + prev.cReturn;
          const flow = m.sInv + m.cInv - (prev.sInv + prev.cInv);
          const denom = vPrev + flow / 2;
          if (denom > 0) {
            // A month can lose at most 100%; bad data could otherwise push the
            // factor negative and flip the sign of the chained product.
            twrGrowth *= Math.max(0, 1 + (m.sReturn + m.cReturn - vPrev - flow) / denom);
            twrMonths++;
          }
        }
        prev = m;
      }
      const portfolioTwr = twrMonths > 0 ? Math.round((twrGrowth - 1) * 1000) / 10 : null;

      // Simple return on capital at work during the year.
      const startValue = prevYearLastMonth
        ? prevYearLastMonth.sReturn + prevYearLastMonth.cReturn
        : 0;
      const capital = startValue + ytdNewInvestedStocks + ytdNewInvestedCrypto;
      const gainOnCapital = capital > 0 ? Math.round((totalYtdGain / capital) * 1000) / 10 : null;

      // Get per-year benchmark returns from backend (Dec→Dec for complete years, Dec→latest for current).
      // Month labels carry 2-digit years ("Jan 26"); backend keys are 4-digit.
      const yb = benchmarkData?.yearlyBenchmarks?.[String(year < 100 ? 2000 + year : year)];
      const round1 = (v: number | null | undefined) => (v != null ? Math.round(v * 10) / 10 : null);
      const spxRoi = round1(yb?.spxReturn);
      const nasdaqRoi = round1(yb?.nasdaqReturn);
      const vwceRoi = round1(yb?.vwceReturn);
      const idx = [yb?.spxReturn, yb?.nasdaqReturn, yb?.vwceReturn].filter(
        (v): v is number => v != null
      );
      const indexAvg = idx.length > 0 ? round1(idx.reduce((a, b) => a + b, 0) / idx.length) : null;

      // Calculate metrics
      const monthCount = yearData.length;
      const totalNewInvested = ytdNewInvestedStocks + ytdNewInvestedCrypto;
      const monthlyAvg = monthCount > 0 ? Math.round(totalNewInvested / monthCount) : 0;

      return {
        year,
        months: monthCount,
        portfolioRoi,
        portfolioTwr,
        gainOnCapital,
        yoyChange: null as number | null,
        cryptoRoi,
        stocksRoi,
        spxRoi,
        nasdaqRoi,
        vwceRoi,
        indexAvg,
        indexMixValue: mixValueByYear.get(year) ?? null,
        newInvested: totalNewInvested,
        monthlyAvg,
        portfolioValue: lastMonth.sReturn + lastMonth.cReturn,
        gain: totalYtdGain,
        totalInvested: lastMonth.sInv + lastMonth.cInv,
      };
    });

    // Calculate YoY changes (array is newest first)
    for (let i = 0; i < annualStats.length - 1; i++) {
      const curr = annualStats[i].portfolioRoi;
      const prev = annualStats[i + 1].portfolioRoi;
      annualStats[i].yoyChange = Math.round((curr - prev) * 10) / 10;
    }

    return annualStats;
  }, [stocks, crypto, benchmarkData]);

  // Per year: which benchmarks returned more than the portfolio. Years without any
  // benchmark data are left out of the comparison.
  const beatStats = useMemo(() => {
    const byYear = new Map<number, string[] | null>();
    const perIndex = Object.fromEntries(BENCHMARKS.map((b) => [b.key, 0])) as Record<
      (typeof BENCHMARKS)[number]['key'],
      number
    >;
    let compared = 0;
    let beaten = 0;
    for (const s of stats) {
      const available = BENCHMARKS.filter((b) => s[b.key] !== null);
      if (available.length === 0) {
        byYear.set(s.year, null);
        continue;
      }
      if (s.portfolioTwr === null) {
        byYear.set(s.year, null);
        continue;
      }
      const twr = s.portfolioTwr;
      const winners = available.filter((b) => (s[b.key] as number) > twr);
      winners.forEach((b) => perIndex[b.key]++);
      byYear.set(
        s.year,
        winners.map((b) => b.short)
      );
      compared++;
      if (winners.length > 0) beaten++;
    }
    return { byYear, perIndex, compared, beaten };
  }, [stats]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="page-header">
          <div className="page-title">
            Performance{' '}
            <span className="page-sub" style={{ fontWeight: 400 }}>
              Combined analysis
            </span>
          </div>
        </div>
        <div
          style={{ color: 'var(--text3)', textAlign: 'center', padding: '60px 0', fontSize: 14 }}
        >
          Loading...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="page-header">
          <div className="page-title">
            Performance{' '}
            <span className="page-sub" style={{ fontWeight: 400 }}>
              Combined analysis
            </span>
          </div>
        </div>
        <div
          style={{ color: 'var(--text3)', textAlign: 'center', padding: '60px 0', fontSize: 14 }}
        >
          Error: {error}
        </div>
      </div>
    );
  }

  const hasData = stocks.months.length > 0 || crypto.months.length > 0;

  // Pre-compute chart data series aligned to range-sliced labels
  const perfPortfolioReturn = combinedReturn.slice(start);
  const perfPortfolioInvested = combinedInvested.slice(start);
  const perfPortfolioRoi = labels.map((m) => {
    const si = stocks.months.indexOf(m);
    const ci = crypto.months.indexOf(m);
    const inv = (si >= 0 ? stocks.invested[si] : 0) + (ci >= 0 ? crypto.invested[ci] : 0);
    const ret = (si >= 0 ? stocks.return[si] : 0) + (ci >= 0 ? crypto.return[ci] : 0);
    return inv > 0 ? ((ret - inv) / inv) * 100 : 0;
  });
  const perfCryptoRoi = labels.map((m) => {
    const ci = crypto.months.indexOf(m);
    return ci >= 0 ? crypto.roi[ci] : null;
  });
  const perfStocksRoi = labels.map((m) => {
    const si = stocks.months.indexOf(m);
    return si >= 0 ? stocks.roi[si] : null;
  });
  const benchAt = benchmarkLookup(benchmarkData);
  const perfSpxRoi = labels.map((m) => benchAt(benchmarkData?.spxRoi, m));
  const perfNasdaqRoi = labels.map((m) => benchAt(benchmarkData?.nasdaqRoi, m));
  const perfVwceRoi = labels.map((m) => benchAt(benchmarkData?.vwceRoi, m));
  const perfCryptoRet = labels.map((m) => {
    const ci = crypto.months.indexOf(m);
    return ci >= 0 ? crypto.return[ci] : 0;
  });
  const perfStocksRet = labels.map((m) => {
    const si = stocks.months.indexOf(m);
    return si >= 0 ? stocks.return[si] : 0;
  });
  const perfCryptoAlloc = labels.map((m) => {
    const ci = crypto.months.indexOf(m);
    return ci >= 0 ? crypto.allocation[ci] : 0;
  });
  const perfStocksAlloc = labels.map((m) => {
    const si = stocks.months.indexOf(m);
    return si >= 0 ? stocks.allocation[si] : 0;
  });
  const perfInvCrypto = monthlyInvestedCrypto.slice(start);
  const perfInvStocks = monthlyInvestedStocks.slice(start);

  // Year-grouped variants
  const _portGrp =
    portGrouping === 'year'
      ? groupByYear(labels, [perfPortfolioReturn, perfPortfolioInvested], ['last', 'last'])
      : null;
  const portLabels = _portGrp ? _portGrp.years : labels;
  const portReturn = (_portGrp ? _portGrp.grouped[0] : perfPortfolioReturn) as (number | null)[];
  const portInvested = (_portGrp ? _portGrp.grouped[1] : perfPortfolioInvested) as (
    | number
    | null
  )[];

  const _roiGrp =
    roiGrouping === 'year'
      ? groupByYear(
          labels,
          [perfPortfolioRoi, perfCryptoRoi, perfStocksRoi, perfSpxRoi, perfNasdaqRoi, perfVwceRoi],
          ['last', 'last', 'last', 'last', 'last', 'last']
        )
      : null;
  const roiLabels = _roiGrp ? _roiGrp.years : labels;
  const roiPortfolio = (_roiGrp ? _roiGrp.grouped[0] : perfPortfolioRoi) as (number | null)[];
  const roiCrypto = (_roiGrp ? _roiGrp.grouped[1] : perfCryptoRoi) as (number | null)[];
  const roiStocks = (_roiGrp ? _roiGrp.grouped[2] : perfStocksRoi) as (number | null)[];
  const roiSpx = (_roiGrp ? _roiGrp.grouped[3] : perfSpxRoi) as (number | null)[];
  const roiNasdaq = (_roiGrp ? _roiGrp.grouped[4] : perfNasdaqRoi) as (number | null)[];
  const roiVwce = (_roiGrp ? _roiGrp.grouped[5] : perfVwceRoi) as (number | null)[];

  const _csGrp =
    cryptoStocksGrouping === 'year'
      ? groupByYear(labels, [perfCryptoRet, perfStocksRet], ['last', 'last'])
      : null;
  const csLabels = _csGrp ? _csGrp.years : labels;
  const csCrypto = (_csGrp ? _csGrp.grouped[0] : perfCryptoRet) as (number | null)[];
  const csStocks = (_csGrp ? _csGrp.grouped[1] : perfStocksRet) as (number | null)[];

  const _allocGrp =
    allocGrouping === 'year'
      ? groupByYear(labels, [perfCryptoAlloc, perfStocksAlloc], ['last', 'last'])
      : null;
  const allocLabels = _allocGrp ? _allocGrp.years : labels;
  const allocCrypto = (_allocGrp ? _allocGrp.grouped[0] : perfCryptoAlloc) as (number | null)[];
  const allocStocks = (_allocGrp ? _allocGrp.grouped[1] : perfStocksAlloc) as (number | null)[];

  const _invGrp =
    invAllocGrouping === 'year'
      ? groupByYear(labels, [perfInvCrypto, perfInvStocks], ['sum', 'sum'])
      : null;
  const invLabels = _invGrp ? _invGrp.years : labels;
  const invCrypto = (_invGrp ? _invGrp.grouped[0] : perfInvCrypto) as (number | null)[];
  const invStocks = (_invGrp ? _invGrp.grouped[1] : perfInvStocks) as (number | null)[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div className="page-title">
          Performance{' '}
          <span className="page-sub" style={{ fontWeight: 400 }}>
            Combined analysis
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

      {!hasData ? (
        <div
          style={{ color: 'var(--text3)', textAlign: 'center', padding: '60px 0', fontSize: 14 }}
        >
          No portfolio data yet. Add entries to see your performance analysis.
        </div>
      ) : (
        <>
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            <div className="kpi-card">
              <div className="kpi-label">Total Value</div>
              <div className="kpi-value pos">{fmt$(currentCombinedValue, true)}</div>
              <div className="kpi-change neu">Invested: {fmt$(currentCombinedInvested, true)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Combined ROI</div>
              <div className={`kpi-value ${clsROI(currentCombinedRoi)}`}>
                {fmtPct(currentCombinedRoi)}
              </div>
              <div className="kpi-change neu">All time</div>
            </div>
            {benchmarkCards.map(({ key, label }) => {
              const idxRoi = indexRoiNow[key];
              const diff = idxRoi !== null ? currentCombinedRoi - idxRoi : null;
              const gap$ = diff !== null ? (diff / 100) * currentCombinedInvested : null;
              return (
                <div
                  className="kpi-card"
                  key={key}
                  title={`Your ROI minus the ROI you'd have if every deposit had gone into ${label} instead (same amounts, same months).`}
                >
                  <div className="kpi-label">vs {label}</div>
                  <div className={`kpi-value ${clsROI(diff)}`}>{fmtPts(diff)}</div>
                  <div className="kpi-change neu">
                    {idxRoi !== null
                      ? `${fmtSign$k(gap$)} · if in ${label}: ${fmtPct(idxRoi)}`
                      : 'No index data'}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="chart-grid">
            <ChartCard
              label="Total Portfolio Value"
              value={fmt$(currentCombinedValue, true)}
              change={`Invested: ${fmt$(currentCombinedInvested, true)}`}
              changePositive={null}
              extraControls={<YearToggle value={portGrouping} onChange={setPortGrouping} />}
              typeToggle={{
                value: portfolioValueType,
                onChange: (v) => setPortfolioValueType(v as 'area' | 'bar'),
                options: [
                  { value: 'area', label: 'Area' },
                  { value: 'bar', label: 'Bar' },
                ],
              }}
              modalContent={
                portfolioValueType === 'area' ? (
                  <AreaChart
                    labels={portLabels}
                    annotations={portGrouping === 'month' ? ann : undefined}
                    datasets={[
                      { label: 'Total Value', data: portReturn as number[], color: C.green },
                      { label: 'Total Invested', data: portInvested as number[], color: C.blue },
                    ]}
                  />
                ) : (
                  <GroupedBarChart
                    labels={portLabels}
                    dataset1={{
                      label: 'Total Value',
                      data: portReturn as number[],
                      color: C.green,
                    }}
                    dataset2={{
                      label: 'Total Invested',
                      data: portInvested as number[],
                      color: C.blue,
                    }}
                  />
                )
              }
            >
              {portfolioValueType === 'area' ? (
                <AreaChart
                  labels={portLabels}
                  annotations={portGrouping === 'month' ? ann : undefined}
                  datasets={[
                    { label: 'Total Value', data: portReturn as number[], color: C.green },
                    { label: 'Total Invested', data: portInvested as number[], color: C.blue },
                  ]}
                />
              ) : (
                <GroupedBarChart
                  labels={portLabels}
                  dataset1={{ label: 'Total Value', data: portReturn as number[], color: C.green }}
                  dataset2={{
                    label: 'Total Invested',
                    data: portInvested as number[],
                    color: C.blue,
                  }}
                />
              )}
            </ChartCard>

            <ChartCard
              label="ROI vs All Benchmarks"
              value={fmtPct(currentCombinedRoi)}
              change="Portfolio vs S&P 500, Nasdaq, VWCE"
              changePositive={currentCombinedRoi >= 0}
              extraControls={<YearToggle value={roiGrouping} onChange={setRoiGrouping} />}
              typeToggle={{
                value: roiBenchmarkType,
                onChange: (v) => setRoiBenchmarkType(v as 'line' | 'bar'),
                options: [
                  { value: 'line', label: 'Line' },
                  { value: 'bar', label: 'Bar' },
                ],
              }}
              modalContent={
                <MultiLineChart
                  labels={roiLabels}
                  annotations={roiGrouping === 'month' ? ann : undefined}
                  datasets={[
                    { label: 'Portfolio', data: roiPortfolio, color: C.green },
                    { label: 'Crypto', data: roiCrypto, color: C.purple },
                    { label: 'Stocks', data: roiStocks, color: C.blue },
                    { label: 'S&P 500', data: roiSpx, color: C.orange, dashed: true },
                    { label: 'Nasdaq', data: roiNasdaq, color: C.yellow, dashed: true },
                    { label: 'VWCE', data: roiVwce, color: C.red, dashed: true },
                  ]}
                  chartType={roiBenchmarkType}
                />
              }
            >
              <MultiLineChart
                labels={roiLabels}
                annotations={roiGrouping === 'month' ? ann : undefined}
                datasets={[
                  { label: 'Portfolio', data: roiPortfolio, color: C.green },
                  { label: 'Crypto', data: roiCrypto, color: C.purple },
                  { label: 'Stocks', data: roiStocks, color: C.blue },
                  { label: 'S&P 500', data: roiSpx, color: C.orange, dashed: true },
                  { label: 'Nasdaq', data: roiNasdaq, color: C.yellow, dashed: true },
                  { label: 'VWCE', data: roiVwce, color: C.red, dashed: true },
                ]}
                chartType={roiBenchmarkType}
              />
            </ChartCard>

            <ChartCard
              label="Crypto vs Stocks Value"
              value={`${fmt$(displayCryptoValue, true)} / ${fmt$(displayStocksValue, true)}`}
              change="Current value by asset class"
              changePositive={null}
              extraControls={
                <YearToggle value={cryptoStocksGrouping} onChange={setCryptoStocksGrouping} />
              }
              typeToggle={{
                value: cryptoVsStocksType,
                onChange: (v) => setCryptoVsStocksType(v as 'line' | 'bar'),
                options: [
                  { value: 'line', label: 'Line' },
                  { value: 'bar', label: 'Bar' },
                ],
              }}
              modalContent={
                cryptoVsStocksType === 'line' ? (
                  <MultiLineChart
                    valueFormat="number"
                    labels={csLabels}
                    datasets={[
                      { label: 'Crypto', data: csCrypto, color: C.purple },
                      { label: 'Stocks', data: csStocks, color: C.blue },
                    ]}
                  />
                ) : (
                  <GroupedBarChart
                    labels={csLabels}
                    dataset1={{ label: 'Crypto', data: csCrypto as number[], color: C.purple }}
                    dataset2={{ label: 'Stocks', data: csStocks as number[], color: C.blue }}
                  />
                )
              }
            >
              {cryptoVsStocksType === 'line' ? (
                <MultiLineChart
                  valueFormat="number"
                  labels={csLabels}
                  datasets={[
                    { label: 'Crypto', data: csCrypto, color: C.purple },
                    { label: 'Stocks', data: csStocks, color: C.blue },
                  ]}
                />
              ) : (
                <GroupedBarChart
                  labels={csLabels}
                  dataset1={{ label: 'Crypto', data: csCrypto as number[], color: C.purple }}
                  dataset2={{ label: 'Stocks', data: csStocks as number[], color: C.blue }}
                />
              )}
            </ChartCard>

            <ChartCard
              label="Allocation Over Time"
              value={`${displayCryptoAlloc}% / ${displayStocksAlloc}%`}
              change="Crypto % vs Stocks %"
              changePositive={null}
              extraControls={<YearToggle value={allocGrouping} onChange={setAllocGrouping} />}
              typeToggle={{
                value: allocationType,
                onChange: (v) => setAllocationType(v as 'line' | 'area' | 'bar'),
                options: [
                  { value: 'line', label: 'Line' },
                  { value: 'area', label: 'Area' },
                  { value: 'bar', label: 'Bar' },
                ],
              }}
              modalContent={
                allocationType === 'line' ? (
                  <MultiLineChart
                    labels={allocLabels}
                    datasets={[
                      { label: 'Crypto %', data: allocCrypto, color: C.purple },
                      { label: 'Stocks %', data: allocStocks, color: C.blue },
                    ]}
                  />
                ) : allocationType === 'area' ? (
                  <AreaChart
                    labels={allocLabels}
                    datasets={[
                      { label: 'Crypto %', data: allocCrypto as number[], color: C.purple },
                      { label: 'Stocks %', data: allocStocks as number[], color: C.blue },
                    ]}
                  />
                ) : (
                  <GroupedBarChart
                    labels={allocLabels}
                    dataset1={{ label: 'Crypto %', data: allocCrypto as number[], color: C.purple }}
                    dataset2={{ label: 'Stocks %', data: allocStocks as number[], color: C.blue }}
                  />
                )
              }
            >
              {allocationType === 'line' ? (
                <MultiLineChart
                  labels={allocLabels}
                  datasets={[
                    { label: 'Crypto %', data: allocCrypto, color: C.purple },
                    { label: 'Stocks %', data: allocStocks, color: C.blue },
                  ]}
                />
              ) : allocationType === 'area' ? (
                <AreaChart
                  labels={allocLabels}
                  datasets={[
                    { label: 'Crypto %', data: allocCrypto as number[], color: C.purple },
                    { label: 'Stocks %', data: allocStocks as number[], color: C.blue },
                  ]}
                />
              ) : (
                <GroupedBarChart
                  labels={allocLabels}
                  dataset1={{ label: 'Crypto %', data: allocCrypto as number[], color: C.purple }}
                  dataset2={{ label: 'Stocks %', data: allocStocks as number[], color: C.blue }}
                />
              )}
            </ChartCard>
          </div>

          <div>
            <div className="chart-grid">
              <ChartCard
                label={
                  invAllocGrouping === 'year'
                    ? 'Annual Invested Allocation'
                    : 'Monthly Invested Allocation'
                }
                value={fmt$(totalMonthlyInvestedCrypto + totalMonthlyInvestedStocks, true)}
                change={`Median: ${fmt$(medianMonthlyCrypto + medianMonthlyStocks, true)} / Current Month: ${fmt$(currentMonthCrypto + currentMonthStocks, true)}`}
                changePositive={
                  currentMonthCrypto + currentMonthStocks >=
                  medianMonthlyCrypto + medianMonthlyStocks
                }
                typeToggle={{
                  value: monthlyInvestedType,
                  onChange: (v) => setMonthlyInvestedType(v as 'bar' | 'line'),
                  options: [
                    { value: 'bar', label: 'Bar' },
                    { value: 'line', label: 'Line' },
                  ],
                }}
                extraControls={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {monthlyInvestedType === 'bar' && invAllocGrouping === 'month' && (
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          cursor: 'pointer',
                          fontSize: 11,
                          color: 'var(--text2)',
                          userSelect: 'none',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={showMonthlyTrend}
                          onChange={(e) => setShowMonthlyTrend(e.target.checked)}
                          style={{ accentColor: '#34d399', width: 12, height: 12 }}
                        />
                        Trend
                      </label>
                    )}
                    <YearToggle value={invAllocGrouping} onChange={setInvAllocGrouping} />
                  </div>
                }
                modalContent={
                  monthlyInvestedType === 'bar' ? (
                    <GroupedBarChart
                      labels={invLabels}
                      dataset1={{ label: 'Crypto', data: invCrypto as number[], color: C.purple }}
                      dataset2={{ label: 'Stocks', data: invStocks as number[], color: C.blue }}
                      medianLine={
                        invAllocGrouping === 'month'
                          ? medianMonthlyCrypto + medianMonthlyStocks
                          : undefined
                      }
                      showTrend={invAllocGrouping === 'month' ? showMonthlyTrend : false}
                    />
                  ) : (
                    <MultiLineChart
                      valueFormat="number"
                      labels={invLabels}
                      datasets={[
                        { label: 'Crypto', data: invCrypto, color: C.purple },
                        { label: 'Stocks', data: invStocks, color: C.blue },
                      ]}
                    />
                  )
                }
              >
                {monthlyInvestedType === 'bar' ? (
                  <GroupedBarChart
                    labels={invLabels}
                    dataset1={{ label: 'Crypto', data: invCrypto as number[], color: C.purple }}
                    dataset2={{ label: 'Stocks', data: invStocks as number[], color: C.blue }}
                    medianLine={
                      invAllocGrouping === 'month'
                        ? medianMonthlyCrypto + medianMonthlyStocks
                        : undefined
                    }
                    showTrend={invAllocGrouping === 'month' ? showMonthlyTrend : false}
                  />
                ) : (
                  <MultiLineChart
                    valueFormat="number"
                    labels={invLabels}
                    datasets={[
                      { label: 'Crypto', data: invCrypto, color: C.purple },
                      { label: 'Stocks', data: invStocks, color: C.blue },
                    ]}
                  />
                )}
              </ChartCard>

              <ChartCard
                label="Allocation"
                value={`${displayCryptoAlloc}% Crypto`}
                change={`${displayStocksAlloc}% Stocks`}
                changePositive={null}
                noExpand
              >
                <div className="donut-wrap">
                  <DonutChart
                    values={[displayCryptoAlloc, displayStocksAlloc]}
                    colors={[C.purple, C.blue]}
                  />
                  <div className="donut-legend">
                    <div className="donut-item">
                      <div className="donut-item-label">
                        <span className="donut-dot" style={{ background: C.purple }} />
                        Crypto
                      </div>
                      <div className="donut-item-value" style={{ color: C.purple }}>
                        {displayCryptoAlloc}%
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {fmt$(lastCryptoInvested, true)} invested
                      </div>
                    </div>
                    <div className="donut-item">
                      <div className="donut-item-label">
                        <span className="donut-dot" style={{ background: C.blue }} />
                        Stocks
                      </div>
                      <div className="donut-item-value" style={{ color: C.blue }}>
                        {displayStocksAlloc}%
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {fmt$(lastStocksInvested, true)} invested
                      </div>
                    </div>
                  </div>
                </div>
              </ChartCard>
            </div>
          </div>

          {/* Annual Statistics Section */}
          <div>
            <div className="section-row" style={{ marginBottom: 10 }}>
              <div className="section-title">Annual Statistics</div>
              <div className="page-sub" style={{ fontWeight: 400 }}>
                Year-over-year breakdown ·{' '}
                {stats.length > 0 ? `${stats[stats.length - 1].year} – ${stats[0].year}` : ''}
              </div>
            </div>

            {/* Year summary cards */}
            <div
              style={{
                display: 'flex',
                gap: 10,
                overflowX: 'auto',
                paddingBottom: 4,
                marginBottom: 20,
              }}
            >
              {stats.map((s) => {
                const isFocus = focusYear === s.year;
                const partial = s.months < 12;
                return (
                  <div
                    key={s.year}
                    onClick={() => setFocusYear(isFocus ? null : s.year)}
                    onMouseEnter={() => setHoveredCard(s.year)}
                    onMouseLeave={() => setHoveredCard(null)}
                    style={{
                      flexShrink: 0,
                      width: 130,
                      background: isFocus ? 'var(--surface2)' : 'var(--surface)',
                      border: `1px solid ${isFocus ? 'var(--purple)' : 'var(--border)'}`,
                      borderRadius: 14,
                      padding: '14px 16px',
                      cursor: 'pointer',
                      transition: 'border-color .15s',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--text3)',
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                        marginBottom: 6,
                      }}
                    >
                      {s.year}
                      {partial ? ' *' : ''}
                    </div>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        fontFamily: 'JetBrains Mono',
                        color: s.portfolioRoi >= 0 ? C.green : C.red,
                        cursor: 'help',
                      }}
                    >
                      {s.portfolioRoi >= 0 ? '+' : ''}
                      {s.portfolioRoi}%
                      {hoveredCard === s.year && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '100%',
                            left: 0,
                            right: 0,
                            marginBottom: 8,
                            background: 'var(--surface-modal)',
                            border: '1px solid var(--border2)',
                            borderRadius: 6,
                            padding: '8px 10px',
                            fontSize: 10,
                            color: 'var(--text)',
                            whiteSpace: 'normal',
                            zIndex: 10,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                          }}
                        >
                          Return on Investment for the year
                        </div>
                      )}
                    </div>
                    {s.yoyChange !== null && (
                      <div
                        style={{
                          fontSize: 11,
                          marginTop: 4,
                          color: s.yoyChange >= 0 ? C.green : C.red,
                          fontWeight: 500,
                          cursor: 'help',
                          position: 'relative',
                        }}
                      >
                        {s.yoyChange >= 0 ? '▲' : '▼'} {Math.abs(s.yoyChange)}% YoY
                        {hoveredCard === s.year && (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '100%',
                              left: 0,
                              right: 0,
                              marginBottom: 8,
                              background: 'var(--surface-modal)',
                              border: '1px solid var(--border2)',
                              borderRadius: 6,
                              padding: '8px 10px',
                              fontSize: 10,
                              color: 'var(--text)',
                              whiteSpace: 'normal',
                              zIndex: 10,
                              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                              width: 150,
                            }}
                          >
                            Year-over-Year change in ROI -{' '}
                            {s.yoyChange >= 0 ? 'improved' : 'declined'} by {Math.abs(s.yoyChange)}%
                            vs previous year
                          </div>
                        )}
                      </div>
                    )}
                    <div
                      style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6, cursor: 'help' }}
                    >
                      ${(s.portfolioValue / 1000).toFixed(0)}k value
                      {hoveredCard === s.year && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '100%',
                            left: 0,
                            right: 0,
                            marginBottom: 8,
                            background: 'var(--surface-modal)',
                            border: '1px solid var(--border2)',
                            borderRadius: 6,
                            padding: '8px 10px',
                            fontSize: 10,
                            color: 'var(--text)',
                            whiteSpace: 'normal',
                            zIndex: 10,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                          }}
                        >
                          Total portfolio value at end of year
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 20 }}>
              * Partial year
            </div>

            {/* Heatmap table */}
            <div className="section-row" style={{ marginBottom: 10 }}>
              <div className="section-title">Heatmap — key metrics by year</div>
            </div>
            {beatStats.compared > 0 && (
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
                Portfolio beat every index in{' '}
                <span style={{ color: C.green, fontWeight: 600 }}>
                  {beatStats.compared - beatStats.beaten} of {beatStats.compared}
                </span>{' '}
                years · beaten in{' '}
                <span style={{ color: C.red, fontWeight: 600 }}>
                  {beatStats.beaten} of {beatStats.compared}
                </span>
                <span style={{ color: 'var(--text3)' }}>
                  {' '}
                  ({BENCHMARKS.map((b) => `${b.label} ${beatStats.perIndex[b.key]}×`).join(', ')})
                </span>
              </div>
            )}
            <div className="data-table-wrap" style={{ overflowX: 'auto', marginBottom: 20 }}>
              <table className="data-table" style={{ minWidth: 700 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', width: 160 }}>Metric</th>
                    {stats.map((s) => (
                      <th
                        key={s.year}
                        style={{
                          background: focusYear === s.year ? 'rgba(167,139,250,0.12)' : '',
                          color: focusYear === s.year ? 'var(--purple)' : '',
                        }}
                      >
                        {s.year}
                        {s.months < 12 ? '*' : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {annualRows.map((row) => (
                    <Fragment key={row.key}>
                      <tr>
                        <td
                          style={{
                            color: 'var(--text2)',
                            fontFamily: 'var(--font-sans)',
                            fontSize: 13,
                            fontWeight: 500,
                            cursor: (row as any).tooltip ? 'help' : 'default',
                          }}
                          onMouseEnter={(e) => {
                            if ((row as any).tooltip) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setTooltipData({
                                text: (row as any).tooltip,
                                x: rect.right + 10,
                                y: rect.top,
                              });
                            }
                          }}
                          onMouseLeave={() => setTooltipData(null)}
                        >
                          {row.label}
                        </td>
                        {stats.map((s) => {
                          const val = s[row.key as keyof AnnualStat] as number | null;
                          const bg = heatColor(val, row.type);
                          let col =
                            row.type === 'pct'
                              ? val === null
                                ? 'var(--text3)'
                                : val >= 0
                                  ? C.green
                                  : C.red
                              : row.type === 'pos'
                                ? C.green
                                : 'var(--text2)';

                          // For Portfolio Value, make it red if invested > value
                          if (row.key === 'portfolioValue' && s.totalInvested > (val || 0)) {
                            col = C.red;
                          }
                          // Index mix: red when it would have beaten the real portfolio
                          if (row.key === 'indexMixValue' && val !== null) {
                            col = val > s.portfolioValue ? C.red : C.green;
                          }

                          return (
                            <td
                              key={s.year}
                              style={{
                                background: focusYear === s.year ? 'rgba(167,139,250,0.06)' : bg,
                                color: col,
                                fontWeight: 600,
                                fontSize: 12,
                                transition: 'background .15s',
                                cursor: (row as any).tooltip ? 'help' : 'default',
                              }}
                              onMouseEnter={(e) => {
                                if ((row as any).tooltip) {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setTooltipData({
                                    text: (row as any).tooltip,
                                    x: rect.right + 10,
                                    y: rect.top,
                                  });
                                }
                              }}
                              onMouseLeave={() => setTooltipData(null)}
                            >
                              <div>{row.fmt(val)}</div>
                              {row.key === 'portfolioValue' && (
                                <div
                                  style={{
                                    fontSize: 9,
                                    color: 'var(--text3)',
                                    fontWeight: 400,
                                    marginTop: 1,
                                  }}
                                >
                                  in: ${(s.totalInvested / 1000).toFixed(1)}k
                                </div>
                              )}
                              {row.key === 'indexMixValue' &&
                                val !== null &&
                                (() => {
                                  // You vs index: dollars, and the ROI gap in points
                                  // (same basis as the benchmark cards/widgets).
                                  const gap = s.portfolioValue - val;
                                  const pts =
                                    s.totalInvested > 0 ? (gap / s.totalInvested) * 100 : null;
                                  return (
                                    <div
                                      style={{
                                        fontSize: 9,
                                        color: 'var(--text3)',
                                        fontWeight: 400,
                                        marginTop: 1,
                                      }}
                                    >
                                      <div>you: ${(s.portfolioValue / 1000).toFixed(1)}k</div>
                                      <div>
                                        you vs index: {fmtSign$k(gap)}
                                        {pts !== null && ` (${fmtPts(pts)})`}
                                      </div>
                                    </div>
                                  );
                                })()}
                            </td>
                          );
                        })}
                      </tr>
                      {row.key === 'indexAvg' && (
                        <tr>
                          <td
                            style={{
                              color: 'var(--text2)',
                              fontFamily: 'var(--font-sans)',
                              fontSize: 13,
                              fontWeight: 500,
                              cursor: 'help',
                            }}
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setTooltipData({
                                text: 'Indices whose yearly return beat Portfolio TWR',
                                x: rect.right + 10,
                                y: rect.top,
                              });
                            }}
                            onMouseLeave={() => setTooltipData(null)}
                          >
                            Beaten by
                          </td>
                          {stats.map((s) => {
                            const winners = beatStats.byYear.get(s.year);
                            return (
                              <td
                                key={s.year}
                                style={{
                                  background:
                                    focusYear === s.year
                                      ? 'rgba(167,139,250,0.06)'
                                      : winners && winners.length > 0
                                        ? 'rgba(248,113,113,0.08)'
                                        : winners
                                          ? 'rgba(52,211,153,0.08)'
                                          : '',
                                  color: !winners
                                    ? 'var(--text3)'
                                    : winners.length > 0
                                      ? C.red
                                      : C.green,
                                  fontWeight: 600,
                                  fontSize: 11,
                                }}
                              >
                                {!winners
                                  ? '—'
                                  : winners.length > 0
                                    ? winners.map((w) => <div key={w}>{w}</div>)
                                    : '✓ none'}
                              </td>
                            );
                          })}
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* YoY bar chart */}
            <div className="section-row" style={{ marginBottom: 10 }}>
              <div className="section-title">Year-over-year ROI comparison</div>
            </div>
            <div style={{ height: 280, marginBottom: 20 }}>
              <YoYBarChart stats={stats} />
            </div>
          </div>

          <div>
            <div className="section-row" style={{ marginBottom: 10 }}>
              <div className="section-title">Cumulative ROI Summary</div>
            </div>
            <div className="data-table-wrap">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Portfolio</th>
                      <th>Crypto ROI</th>
                      <th>Stocks ROI</th>
                      <th>S&P 500</th>
                      <th>Nasdaq</th>
                      <th>Crypto %</th>
                      <th>Stocks %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {months
                      .slice()
                      .reverse()
                      .map((m) => {
                        const si = stocks.months.indexOf(m);
                        const ci = crypto.months.indexOf(m);
                        const totalInv =
                          (si >= 0 ? stocks.invested[si] : 0) + (ci >= 0 ? crypto.invested[ci] : 0);
                        const totalRet =
                          (si >= 0 ? stocks.return[si] : 0) + (ci >= 0 ? crypto.return[ci] : 0);
                        const portfolioRoi =
                          totalInv > 0 ? ((totalRet - totalInv) / totalInv) * 100 : 0;
                        const stockRoi = si >= 0 ? stocks.roi[si] : null;
                        const cryptoRoi = ci >= 0 ? crypto.roi[ci] : null;
                        const spxRoi = benchAt(benchmarkData?.spxRoi, m);
                        const nasdaqRoi = benchAt(benchmarkData?.nasdaqRoi, m);
                        const cryptoAlloc = ci >= 0 ? crypto.allocation[ci] : 0;
                        const stocksAlloc = si >= 0 ? stocks.allocation[si] : 0;

                        return (
                          <tr key={m}>
                            <td>{m}</td>
                            <td className={clsROI(portfolioRoi)}>{fmtPct(portfolioRoi)}</td>
                            <td className={clsROI(cryptoRoi)}>{fmtPct(cryptoRoi)}</td>
                            <td className={clsROI(stockRoi)}>{fmtPct(stockRoi)}</td>
                            <td className={clsROI(spxRoi)}>{fmtPct(spxRoi)}</td>
                            <td className={clsROI(nasdaqRoi)}>{fmtPct(nasdaqRoi)}</td>
                            <td className="neu">{Math.round(cryptoAlloc)}%</td>
                            <td className="neu">{Math.round(stocksAlloc)}%</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {tooltipData && (
        <div
          style={{
            position: 'fixed',
            left: tooltipData.x,
            top: tooltipData.y,
            background: 'var(--surface-modal)',
            border: '1px solid var(--border2)',
            borderRadius: 6,
            padding: '8px 12px',
            fontSize: 11,
            color: 'var(--text)',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {tooltipData.text}
        </div>
      )}
    </div>
  );
}
