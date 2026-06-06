import { useState, useEffect, useMemo } from 'react';
import { ChartCard } from '../components/ChartCard';
import { TimeRange } from '../components/TimeRange';
import { AreaChart } from '../components/charts/AreaChart';
import { MultiLineChart } from '../components/charts/MultiLineChart';
import { InvestedChart } from '../components/charts/InvestedChart';
import { calcAverage } from '../lib/trendUtils';
import { GroupedBarChart } from '../components/charts/GroupedBarChart';
import { SavingsRateFlexChart } from '../components/charts/SavingsRateFlexChart';
import { IncomeExpFlexChart } from '../components/charts/IncomeExpFlexChart';
import {
  fmt$,
  fmtSign$,
  fmtPct,
  clsROI,
  getCurrencyFormatter,
  convertCurrency,
} from '../lib/formatters';
import { sliceRange, type Range } from '../lib/ranges';
import { buildAnnotations, C } from '../lib/chartDefaults';
import { type SavingsEntry } from '../lib/storage';
import { groupByYear } from '../lib/groupByYear';
import { YearToggle } from '../components/YearToggle';
import {
  api,
  type StockData,
  type CryptoData,
  type BenchmarkData,
  type AssetHistoryPoint,
  type DebtHistoryPoint,
  type DebtEntry,
  type ExchangeRates,
} from '../lib/api';

const CHART_OPTS = [
  { value: 'bar', label: 'Bar' },
  { value: 'line', label: 'Line' },
];

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

export function Dashboard() {
  const [range, setRange] = useState<Range>('ALL');
  const [showEvents, setShowEvents] = useState(true);
  const [portfolioValueType, setPortfolioValueType] = useState<'area' | 'bar'>('area');
  const [roiBenchmarkType, setRoiBenchmarkType] = useState<'line' | 'bar'>('line');
  const [totalChartType, setTotalChartType] = useState<'bar' | 'line'>('bar');
  const [cryptoChartType, setCryptoChartType] = useState<'bar' | 'line'>('bar');
  const [stocksChartType, setStocksChartType] = useState<'bar' | 'line'>('bar');
  const [savingsRateChartType, setSavingsRateChartType] = useState<'line' | 'bar'>('line');
  const [incomeExpChartType, setIncomeExpChartType] = useState<'line' | 'bar'>('line');
  const [nwGrouping, setNwGrouping] = useState<'month' | 'year'>('month');
  const [portGrouping, setPortGrouping] = useState<'month' | 'year'>('month');
  const [invTotalGrouping, setInvTotalGrouping] = useState<'month' | 'year'>('month');
  const [roiGrouping, setRoiGrouping] = useState<'month' | 'year'>('month');
  const [cryptoInvGrouping, setCryptoInvGrouping] = useState<'month' | 'year'>('month');
  const [stocksInvGrouping, setStocksInvGrouping] = useState<'month' | 'year'>('month');
  const [savRateGrouping, setSavRateGrouping] = useState<'month' | 'year'>('month');
  const [incExpGrouping, setIncExpGrouping] = useState<'month' | 'year'>('month');

  const [stockData, setStockData] = useState<StockData | null>(null);
  const [cryptoData, setCryptoData] = useState<CryptoData | null>(null);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData | null>(null);
  const [savingsEntries, setSavingsEntries] = useState<SavingsEntry[]>([]);
  const [savingsTarget, setSavingsTarget] = useState(30);
  const [currency, setCurrency] = useState('USD');
  const [assetHistory, setAssetHistory] = useState<AssetHistoryPoint[]>([]);
  const [rawDebtHistory, setRawDebtHistory] = useState<DebtHistoryPoint[]>([]);
  const [debtEntries, setDebtEntries] = useState<DebtEntry[]>([]);
  const [debtsCurrency, setDebtsCurrency] = useState('USD');
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({
    usdToRon: 4.35,
    eurToRon: 5.09,
  });

  useEffect(() => {
    Promise.all([
      api.stocks.get(),
      api.crypto.get(),
      api.savings.list(),
      api.settings.getSavingsTarget(),
      api.settings.getCurrency(),
      api.assets.history(),
      api.debts.history(),
      api.debtEntries.list(),
      api.settings.getDebtsCurrency(),
      api.settings.getExchangeRates(),
      api.benchmarks.get(),
    ])
      .then(([stocks, crypto, savs, target, curr, ah, dh, de, dc, er, bm]) => {
        setStockData(stocks);
        setCryptoData(crypto);
        setBenchmarkData(bm);
        setSavingsEntries(savs);
        setSavingsTarget(target.value);
        setCurrency(curr.value);
        setAssetHistory(ah);
        setRawDebtHistory(dh);
        setDebtEntries(de);
        setDebtsCurrency(dc.value);
        setExchangeRates(er);
      })
      .catch(console.error);
  }, []);

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

  // Merge and sort all portfolio months chronologically
  const allMonths = useMemo(() => {
    const set = new Set([...stocks.months, ...crypto.months]);
    return Array.from(set).sort((a, b) => {
      const [aMo, aYr] = a.split(' ');
      const [bMo, bYr] = b.split(' ');
      const yDiff = parseInt(aYr) - parseInt(bYr);
      return yDiff !== 0 ? yDiff : (MO_ORDER[aMo] ?? 0) - (MO_ORDER[bMo] ?? 0);
    });
  }, [stocks.months, crypto.months]);

  const hasPortfolioData = allMonths.length > 0;

  // Combined portfolio series aligned to allMonths
  const combinedReturn = allMonths.map((m) => {
    const si = stocks.months.indexOf(m);
    const ci = crypto.months.indexOf(m);
    return (si >= 0 ? stocks.return[si] : 0) + (ci >= 0 ? crypto.return[ci] : 0);
  });
  const combinedInvested = allMonths.map((m) => {
    const si = stocks.months.indexOf(m);
    const ci = crypto.months.indexOf(m);
    return (si >= 0 ? stocks.invested[si] : 0) + (ci >= 0 ? crypto.invested[ci] : 0);
  });
  const combinedRoi = combinedInvested.map((inv, i) =>
    inv > 0 ? ((combinedReturn[i] - inv) / inv) * 100 : 0
  );

  // Per-asset monthly invested (delta from prev month)
  const monthlyInvestedCrypto = allMonths.map((m, i) => {
    const ci = crypto.months.indexOf(m);
    if (ci < 0) return 0;
    if (i === 0) return crypto.invested[ci];
    const prevM = allMonths[i - 1];
    const prevCi = crypto.months.indexOf(prevM);
    return Math.max(
      0,
      Math.round(crypto.invested[ci] - (prevCi >= 0 ? crypto.invested[prevCi] : 0))
    );
  });
  const monthlyInvestedStocks = allMonths.map((m, i) => {
    const si = stocks.months.indexOf(m);
    if (si < 0) return 0;
    if (i === 0) return stocks.invested[si];
    const prevM = allMonths[i - 1];
    const prevSi = stocks.months.indexOf(prevM);
    return Math.max(
      0,
      Math.round(stocks.invested[si] - (prevSi >= 0 ? stocks.invested[prevSi] : 0))
    );
  });
  const monthlyInvestedTotal = allMonths.map(
    (_, i) => monthlyInvestedCrypto[i] + monthlyInvestedStocks[i]
  );

  // Current values
  const lastIdx = allMonths.length - 1;
  const curPortfolioValue = lastIdx >= 0 ? combinedReturn[lastIdx] : 0;
  const curTotalInvested = lastIdx >= 0 ? combinedInvested[lastIdx] : 0;
  const curTotalGain = curPortfolioValue - curTotalInvested;
  const curTotalRoi = curTotalInvested > 0 ? (curTotalGain / curTotalInvested) * 100 : 0;
  const prevRoi = lastIdx > 0 ? combinedRoi[lastIdx - 1] : curTotalRoi;
  const roiDelta = curTotalRoi - prevRoi;

  // Benchmark ROI from API (aligned to allMonths)
  const spxSeries = allMonths.map((m) => {
    const i = benchmarkData ? benchmarkData.months.indexOf(m) : -1;
    return i >= 0 ? benchmarkData!.spxRoi[i] : null;
  });
  const nasdaqSeries = allMonths.map((m) => {
    const i = benchmarkData ? benchmarkData.months.indexOf(m) : -1;
    return i >= 0 ? benchmarkData!.nasdaqRoi[i] : null;
  });
  const lastSpx = spxSeries.filter((v) => v !== null).pop() ?? 0;

  // ── Net Worth timeline (Jan 2021 → now) ──────────────────────────────────
  const NW_MONTHS = useMemo(() => {
    const result: string[] = [];
    const moNames = [
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
    const now = new Date();
    let yr = 2021,
      mo = 0;
    while (yr < now.getFullYear() || (yr === now.getFullYear() && mo <= now.getMonth())) {
      result.push(`${moNames[mo]} ${yr}`);
      mo++;
      if (mo > 11) {
        mo = 0;
        yr++;
      }
    }
    return result;
  }, []);

  const normDate = (d: string): string => {
    // convert ISO "2024-04-01" → "Apr 2024", leave "Apr 2024" as-is
    if (/^\d{4}-\d{2}/.test(d)) {
      const dt = new Date(d);
      return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
    }
    return d;
  };

  const nwPortfolio = NW_MONTHS.map((m) => {
    const i = allMonths.indexOf(m);
    return i >= 0 ? combinedReturn[i] : null;
  });
  const nwAssets = NW_MONTHS.map((m) => {
    const pt = assetHistory.find((p) => normDate(p.date) === m);
    return pt ? pt.totalValue : null;
  });
  const debtHistory = useMemo(() => {
    const byDate: Record<string, number> = {};
    for (const e of debtEntries) {
      const from = e.currency || debtsCurrency;
      byDate[e.date] =
        (byDate[e.date] ?? 0) +
        convertCurrency(
          e.amount,
          from,
          debtsCurrency,
          exchangeRates.usdToRon,
          exchangeRates.eurToRon
        );
    }
    return rawDebtHistory.map((h) => ({ date: h.date, totalDebt: byDate[h.date] ?? h.totalDebt }));
  }, [debtEntries, rawDebtHistory, debtsCurrency, exchangeRates]);

  const nwDebts = NW_MONTHS.map((m) => {
    const pt = debtHistory.find((p) => normDate(p.date) === m);
    return pt ? pt.totalDebt : null;
  });
  const nwTotal = NW_MONTHS.map((_, i) => {
    const port = nwPortfolio[i];
    const asset = nwAssets[i];
    const debt = nwDebts[i];
    if (port === null && asset === null) return null;
    return (port ?? 0) + (asset ?? 0) - (debt ?? 0);
  });
  const nwNoAssets = NW_MONTHS.map((_, i) => {
    const port = nwPortfolio[i];
    const debt = nwDebts[i];
    if (port === null) return null;
    return (port ?? 0) - (debt ?? 0);
  });

  const latestNW = nwTotal.filter((v) => v !== null).pop() ?? null;
  const latestNWNoAssets = nwNoAssets.filter((v) => v !== null).pop() ?? null;

  const latestDebt = nwDebts.filter((v) => v !== null).pop() ?? null;
  const latestDebtUSD =
    latestDebt !== null
      ? convertCurrency(
          latestDebt,
          debtsCurrency,
          'USD',
          exchangeRates.usdToRon,
          exchangeRates.eurToRon
        )
      : null;
  // ─────────────────────────────────────────────────────────────────────────

  const { start } = sliceRange(range, allMonths.length);
  const labels = allMonths.slice(start);
  const ann = buildAnnotations(labels, showEvents);

  const slicedCrypto = monthlyInvestedCrypto.slice(start);
  const slicedStocks = monthlyInvestedStocks.slice(start);
  const slicedTotal = monthlyInvestedTotal.slice(start);
  const totalCrypto = slicedCrypto.reduce((a, b) => a + b, 0);
  const totalStocks = slicedStocks.reduce((a, b) => a + b, 0);

  const avgTotal = calcAverage(slicedTotal);
  const avgCrypto = calcAverage(slicedCrypto);
  const avgStocks = calcAverage(slicedStocks);
  const curTotal = slicedTotal[slicedTotal.length - 1] ?? 0;
  const curCrypto = slicedCrypto[slicedCrypto.length - 1] ?? 0;
  const curStocks = slicedStocks[slicedStocks.length - 1] ?? 0;

  // Savings derived stats
  const sortedSavings = [...savingsEntries].sort((a, b) =>
    b.yr !== a.yr ? b.yr - a.yr : (MO_ORDER[b.mo] ?? 0) - (MO_ORDER[a.mo] ?? 0)
  );
  const chronologicalSavings = [...savingsEntries].sort((a, b) =>
    a.yr !== b.yr ? a.yr - b.yr : (MO_ORDER[a.mo] ?? 0) - (MO_ORDER[b.mo] ?? 0)
  );
  const latestSavings = sortedSavings[0] ?? null;
  const totalSaved = savingsEntries.reduce((s, e) => s + e.savings, 0);
  const avgSavingsRate =
    savingsEntries.length > 0
      ? Math.round(
          (savingsEntries.reduce((s, e) => s + e.savingRate, 0) / savingsEntries.length) * 10
        ) / 10
      : 0;
  const vsTarget = latestSavings
    ? Math.round((latestSavings.savingRate - savingsTarget) * 10) / 10
    : 0;
  const fmt = getCurrencyFormatter(currency);
  const hasSavings = savingsEntries.length > 0;

  const savingsLabels = chronologicalSavings.map((e) => `${e.mo} ${e.yr}`);
  const savingsRates = chronologicalSavings.map((e) => e.savingRate);
  const savingsTargets = chronologicalSavings.map(() => savingsTarget);
  const savingsIncome = chronologicalSavings.map((e) => e.netIncome);
  const savingsExpenses = chronologicalSavings.map((e) => e.totalExpenses);

  // Year-grouped variants for Dashboard charts
  const _nwGrp =
    nwGrouping === 'year'
      ? groupByYear(
          NW_MONTHS,
          [nwPortfolio, nwDebts, nwTotal, nwNoAssets],
          ['last', 'last', 'last', 'last']
        )
      : null;
  const nwLabels = _nwGrp ? _nwGrp.years : NW_MONTHS;
  const nwPortG = _nwGrp ? _nwGrp.grouped[0] : nwPortfolio;
  const nwDebtG = _nwGrp ? _nwGrp.grouped[1] : nwDebts;
  const nwTotalG = _nwGrp ? _nwGrp.grouped[2] : nwTotal;
  const nwNoAssetsG = _nwGrp ? _nwGrp.grouped[3] : nwNoAssets;

  const _portGrp =
    portGrouping === 'year'
      ? groupByYear(
          labels,
          [combinedReturn.slice(start), combinedInvested.slice(start)],
          ['last', 'last']
        )
      : null;
  const portLabels = _portGrp ? _portGrp.years : labels;
  const portReturn = (_portGrp ? _portGrp.grouped[0] : combinedReturn.slice(start)) as (
    | number
    | null
  )[];
  const portInvested = (_portGrp ? _portGrp.grouped[1] : combinedInvested.slice(start)) as (
    | number
    | null
  )[];
  const portAnn = portGrouping === 'month' ? ann : undefined;

  const _invTotalGrp =
    invTotalGrouping === 'year' ? groupByYear(labels, [slicedTotal], ['sum']) : null;
  const invTotalLabels = _invTotalGrp ? _invTotalGrp.years : labels;
  const invTotalData = (_invTotalGrp ? _invTotalGrp.grouped[0] : slicedTotal) as number[];

  const _roiGrp =
    roiGrouping === 'year'
      ? groupByYear(
          labels,
          [combinedRoi.slice(start), spxSeries.slice(start), nasdaqSeries.slice(start)],
          ['last', 'last', 'last']
        )
      : null;
  const roiLabels = _roiGrp ? _roiGrp.years : labels;
  const roiPortfolio = (_roiGrp ? _roiGrp.grouped[0] : combinedRoi.slice(start)) as (
    | number
    | null
  )[];
  const roiSpx = (_roiGrp ? _roiGrp.grouped[1] : spxSeries.slice(start)) as (number | null)[];
  const roiNasdaq = (_roiGrp ? _roiGrp.grouped[2] : nasdaqSeries.slice(start)) as (number | null)[];
  const roiAnn = roiGrouping === 'month' ? ann : undefined;

  const _cryptoInvGrp =
    cryptoInvGrouping === 'year' ? groupByYear(labels, [slicedCrypto], ['sum']) : null;
  const cryptoInvLabels = _cryptoInvGrp ? _cryptoInvGrp.years : labels;
  const cryptoInvData = (_cryptoInvGrp ? _cryptoInvGrp.grouped[0] : slicedCrypto) as number[];

  const _stocksInvGrp =
    stocksInvGrouping === 'year' ? groupByYear(labels, [slicedStocks], ['sum']) : null;
  const stocksInvLabels = _stocksInvGrp ? _stocksInvGrp.years : labels;
  const stocksInvData = (_stocksInvGrp ? _stocksInvGrp.grouped[0] : slicedStocks) as number[];

  const _savRateGrp =
    savRateGrouping === 'year'
      ? groupByYear(savingsLabels, [savingsRates, savingsTargets], ['avg', 'last'])
      : null;
  const savRateLabels = _savRateGrp ? _savRateGrp.years : savingsLabels;
  const savRatesData = (_savRateGrp ? _savRateGrp.grouped[0] : savingsRates) as number[];
  const savTargetsData = (_savRateGrp ? _savRateGrp.grouped[1] : savingsTargets) as number[];

  const _incExpGrp =
    incExpGrouping === 'year'
      ? groupByYear(savingsLabels, [savingsIncome, savingsExpenses], ['sum', 'sum'])
      : null;
  const incExpLabels = _incExpGrp ? _incExpGrp.years : savingsLabels;
  const incExpIncome = (_incExpGrp ? _incExpGrp.grouped[0] : savingsIncome) as number[];
  const incExpExpenses = (_incExpGrp ? _incExpGrp.grouped[1] : savingsExpenses) as number[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">
            {hasPortfolioData
              ? `${allMonths[0]} – ${allMonths[lastIdx]} · All investments`
              : 'No portfolio data yet'}
          </div>
        </div>
        {hasPortfolioData && (
          <TimeRange
            value={range}
            onChange={setRange}
            showEvents={showEvents}
            onToggleEvents={() => setShowEvents((v) => !v)}
          />
        )}
      </div>

      {!hasPortfolioData && !hasSavings ? (
        <div
          style={{ color: 'var(--text3)', textAlign: 'center', padding: '60px 0', fontSize: 14 }}
        >
          No data yet. Add entries or import a CSV in Settings.
        </div>
      ) : (
        <>
          {/* KPI Row — Investments */}
          {hasPortfolioData && (
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-label">Portfolio Value</div>
                <div className="kpi-value">{fmt$(curPortfolioValue, true)}</div>
                <div className={`kpi-change ${clsROI(curTotalRoi)}`}>
                  {fmtPct(curTotalRoi)} all-time ROI
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Total Invested</div>
                <div className="kpi-value">{fmt$(curTotalInvested, true)}</div>
                <div className="kpi-change neu">Crypto + Stocks</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Total Gain</div>
                <div className={`kpi-value ${clsROI(curTotalGain)}`}>{fmtSign$(curTotalGain)}</div>
                <div className={`kpi-change ${roiDelta >= 0 ? 'pos' : 'neg'}`}>
                  {fmtPct(roiDelta)} vs last month
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Total Debt</div>
                <div className="kpi-value neg">
                  {latestDebtUSD !== null ? fmt$(latestDebtUSD, true) : '—'}
                </div>
                <div className="kpi-change neu">in USD</div>
              </div>
            </div>
          )}

          {/* KPI Row — Savings Health */}
          {hasSavings && latestSavings && (
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-label">Saving Rate</div>
                <div className={`kpi-value ${vsTarget >= 0 ? 'pos' : 'neg'}`}>
                  {latestSavings.savingRate.toFixed(1)}%
                </div>
                <div className={`kpi-change ${vsTarget >= 0 ? 'pos' : 'neg'}`}>
                  {vsTarget >= 0 ? '▲' : '▼'} {Math.abs(vsTarget)}% vs {savingsTarget}% target
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Monthly Income</div>
                <div className="kpi-value">{fmt(latestSavings.netIncome)}</div>
                <div className="kpi-change neu">
                  {latestSavings.mo} {latestSavings.yr}
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Monthly Expenses</div>
                <div className="kpi-value neg">{fmt(latestSavings.totalExpenses)}</div>
                <div className="kpi-change neu">
                  {latestSavings.netIncome > 0
                    ? Math.round((latestSavings.totalExpenses / latestSavings.netIncome) * 100)
                    : 0}
                  % of income
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Total Saved</div>
                <div className="kpi-value pos">{fmt(totalSaved)}</div>
                <div className="kpi-change neu">Avg {avgSavingsRate}% rate</div>
              </div>
            </div>
          )}

          {/* Portfolio Charts */}
          {hasPortfolioData && (
            <>
              {/* Net Worth — full width */}
              <div>
                <div className="section-row" style={{ marginBottom: 10 }}>
                  <div className="section-title">Net Worth · Jan 2021 – Present</div>
                </div>
                <ChartCard
                  label="Net Worth Overview"
                  value={latestNW !== null ? fmt$(latestNW, true) : '—'}
                  change={
                    latestNWNoAssets !== null ? `${fmt$(latestNWNoAssets, true)} excl. assets` : '—'
                  }
                  changePositive={latestNW !== null ? latestNW >= 0 : null}
                  extraControls={<YearToggle value={nwGrouping} onChange={setNwGrouping} />}
                  modalContent={
                    <MultiLineChart
                      labels={nwLabels}
                      valueFormat="number"
                      datasets={[
                        { label: 'Stocks & Crypto', data: nwPortG, color: C.blue },
                        { label: 'Debts', data: nwDebtG, color: C.red },
                        { label: 'Net Worth', data: nwTotalG, color: C.green },
                        {
                          label: 'Net Worth (excl. assets)',
                          data: nwNoAssetsG,
                          color: C.yellow,
                          dashed: true,
                        },
                      ]}
                    />
                  }
                >
                  <MultiLineChart
                    labels={nwLabels}
                    valueFormat="number"
                    datasets={[
                      { label: 'Stocks & Crypto', data: nwPortG, color: C.blue },
                      { label: 'Debts', data: nwDebtG, color: C.red },
                      { label: 'Net Worth', data: nwTotalG, color: C.green },
                      {
                        label: 'Net Worth (excl. assets)',
                        data: nwNoAssetsG,
                        color: C.yellow,
                        dashed: true,
                      },
                    ]}
                  />
                </ChartCard>
              </div>

              {/* Portfolio Value — full width */}
              <ChartCard
                label="Portfolio Value"
                value={fmt$(curPortfolioValue, true)}
                change={fmtPct(curTotalRoi) + ' all-time'}
                changePositive={curTotalRoi >= 0}
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
                      annotations={portAnn}
                      datasets={[
                        { label: 'Total Value', data: portReturn as number[], color: C.green },
                        { label: 'Invested', data: portInvested as number[], color: C.blue },
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
                        label: 'Invested',
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
                    datasets={[
                      { label: 'Total Value', data: portReturn as number[], color: C.green },
                      { label: 'Invested', data: portInvested as number[], color: C.blue },
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
                    dataset2={{ label: 'Invested', data: portInvested as number[], color: C.blue }}
                  />
                )}
              </ChartCard>

              {/* Monthly Invested + ROI vs Benchmarks */}
              <div className="chart-grid">
                <ChartCard
                  label={invTotalGrouping === 'year' ? 'Annual Invested' : 'Monthly Invested'}
                  value={fmt$(
                    slicedTotal.reduce((a, b) => a + b, 0),
                    true
                  )}
                  change={`Avg: ${fmt$(avgTotal, true)} / Current: ${fmt$(curTotal, true)}`}
                  changePositive={curTotal >= avgTotal}
                  extraControls={
                    <YearToggle value={invTotalGrouping} onChange={setInvTotalGrouping} />
                  }
                  typeToggle={{
                    value: totalChartType,
                    onChange: (v) => setTotalChartType(v as 'bar' | 'line'),
                    options: CHART_OPTS,
                  }}
                  modalContent={
                    <InvestedChart
                      labels={invTotalLabels}
                      data={invTotalData}
                      color={C.blue}
                      chartType={totalChartType}
                    />
                  }
                >
                  <InvestedChart
                    labels={invTotalLabels}
                    data={invTotalData}
                    color={C.blue}
                    chartType={totalChartType}
                  />
                </ChartCard>

                <ChartCard
                  label="ROI vs Benchmarks"
                  value={fmtPct(curTotalRoi)}
                  change={fmtPct(curTotalRoi - (lastSpx as number)) + ' vs S&P 500'}
                  changePositive={curTotalRoi > (lastSpx as number)}
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
                      annotations={roiAnn}
                      datasets={[
                        { label: 'Portfolio ROI', data: roiPortfolio, color: C.green },
                        { label: 'S&P 500', data: roiSpx, color: C.orange, dashed: true },
                        { label: 'Nasdaq', data: roiNasdaq, color: C.yellow, dashed: true },
                      ]}
                    />
                  }
                >
                  <MultiLineChart
                    labels={roiLabels}
                    datasets={[
                      { label: 'Portfolio ROI', data: roiPortfolio, color: C.green },
                      { label: 'S&P 500', data: roiSpx, color: C.orange, dashed: true },
                      { label: 'Nasdaq', data: roiNasdaq, color: C.yellow, dashed: true },
                    ]}
                  />
                </ChartCard>
              </div>

              {/* Monthly breakdown: Crypto vs Stocks */}
              <div>
                <div className="section-row" style={{ marginBottom: 10 }}>
                  <div className="section-title">Monthly Invested · Breakdown</div>
                </div>
                <div className="chart-grid">
                  <ChartCard
                    label={
                      cryptoInvGrouping === 'year'
                        ? 'Annual Crypto Invested'
                        : 'Monthly Crypto Invested'
                    }
                    value={fmt$(totalCrypto, true)}
                    change={`Avg: ${fmt$(avgCrypto, true)} / Current: ${fmt$(curCrypto, true)}`}
                    changePositive={curCrypto >= avgCrypto}
                    extraControls={
                      <YearToggle value={cryptoInvGrouping} onChange={setCryptoInvGrouping} />
                    }
                    typeToggle={{
                      value: cryptoChartType,
                      onChange: (v) => setCryptoChartType(v as 'bar' | 'line'),
                      options: CHART_OPTS,
                    }}
                    modalContent={
                      <InvestedChart
                        labels={cryptoInvLabels}
                        data={cryptoInvData}
                        color={C.purple}
                        chartType={cryptoChartType}
                      />
                    }
                  >
                    <InvestedChart
                      labels={cryptoInvLabels}
                      data={cryptoInvData}
                      color={C.purple}
                      chartType={cryptoChartType}
                    />
                  </ChartCard>

                  <ChartCard
                    label={
                      stocksInvGrouping === 'year'
                        ? 'Annual Stocks Invested'
                        : 'Monthly Stocks Invested'
                    }
                    value={fmt$(totalStocks, true)}
                    change={`Avg: ${fmt$(avgStocks, true)} / Current: ${fmt$(curStocks, true)}`}
                    changePositive={curStocks >= avgStocks}
                    extraControls={
                      <YearToggle value={stocksInvGrouping} onChange={setStocksInvGrouping} />
                    }
                    typeToggle={{
                      value: stocksChartType,
                      onChange: (v) => setStocksChartType(v as 'bar' | 'line'),
                      options: CHART_OPTS,
                    }}
                    modalContent={
                      <InvestedChart
                        labels={stocksInvLabels}
                        data={stocksInvData}
                        color={C.blue}
                        chartType={stocksChartType}
                      />
                    }
                  >
                    <InvestedChart
                      labels={stocksInvLabels}
                      data={stocksInvData}
                      color={C.blue}
                      chartType={stocksChartType}
                    />
                  </ChartCard>
                </div>
              </div>
            </>
          )}

          {/* Savings Overview */}
          {hasSavings && (
            <div>
              <div className="section-row" style={{ marginBottom: 10 }}>
                <div className="section-title">Savings Overview</div>
                <div className="page-sub" style={{ fontWeight: 400 }}>
                  {savingsLabels[0]} – {savingsLabels[savingsLabels.length - 1]}
                </div>
              </div>
              <div className="chart-grid">
                <ChartCard
                  label="Saving Rate Trend"
                  value={latestSavings ? latestSavings.savingRate.toFixed(1) + '%' : '—'}
                  change={
                    vsTarget >= 0 ? `+${vsTarget}% above target` : `${vsTarget}% below target`
                  }
                  changePositive={vsTarget >= 0}
                  extraControls={
                    <YearToggle value={savRateGrouping} onChange={setSavRateGrouping} />
                  }
                  typeToggle={{
                    value: savingsRateChartType,
                    onChange: (v) => setSavingsRateChartType(v as 'line' | 'bar'),
                    options: [
                      { value: 'line', label: 'Line' },
                      { value: 'bar', label: 'Bar' },
                    ],
                  }}
                  modalContent={
                    <SavingsRateFlexChart
                      labels={savRateLabels}
                      rates={savRatesData}
                      targets={savTargetsData}
                      chartType={savingsRateChartType}
                    />
                  }
                >
                  <SavingsRateFlexChart
                    labels={savRateLabels}
                    rates={savRatesData}
                    targets={savTargetsData}
                    chartType={savingsRateChartType}
                  />
                </ChartCard>

                <ChartCard
                  label="Income vs Expenses"
                  value={latestSavings ? fmt(latestSavings.netIncome) : '—'}
                  change={latestSavings ? fmt(latestSavings.savings) + ' saved' : '—'}
                  changePositive={latestSavings ? latestSavings.savings > 0 : null}
                  extraControls={<YearToggle value={incExpGrouping} onChange={setIncExpGrouping} />}
                  typeToggle={{
                    value: incomeExpChartType,
                    onChange: (v) => setIncomeExpChartType(v as 'line' | 'bar'),
                    options: [
                      { value: 'line', label: 'Line' },
                      { value: 'bar', label: 'Bar' },
                    ],
                  }}
                  modalContent={
                    <IncomeExpFlexChart
                      labels={incExpLabels}
                      income={incExpIncome}
                      expenses={incExpExpenses}
                      chartType={incomeExpChartType}
                    />
                  }
                >
                  <IncomeExpFlexChart
                    labels={incExpLabels}
                    income={incExpIncome}
                    expenses={incExpExpenses}
                    chartType={incomeExpChartType}
                  />
                </ChartCard>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
