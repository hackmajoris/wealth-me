import type { BenchmarkData } from './api';

/**
 * Returns a lookup that reads a benchmark series by portfolio month label.
 * Benchmark months are "Sep 2019"; portfolio months are "Sep 19".
 */
export function benchmarkLookup(data: BenchmarkData | undefined) {
  const idx = new Map<string, number>(
    (data?.months ?? []).map((m, i) => {
      const [mo, yr] = m.split(' ');
      return [`${mo} ${yr.slice(-2)}`, i];
    })
  );
  return (series: (number | null)[] | undefined, month: string): number | null => {
    const i = idx.get(month);
    return i !== undefined ? (series?.[i] ?? null) : null;
  };
}

export type BenchmarkKey = 'spxRoi' | 'nasdaqRoi' | 'vwceRoi';

/**
 * Monthly return of an equal-weight mix of the given benchmarks (rebalanced
 * monthly), keyed by portfolio month label ("Sep 19"). A single key gives that
 * index on its own. Months where none of the benchmarks have data are omitted.
 */
export function monthlyReturns(
  data: BenchmarkData | undefined,
  keys: BenchmarkKey[]
): Map<string, number> {
  const out = new Map<string, number>();
  if (!data) return out;
  const series = keys.map((k) => data[k] ?? []);
  for (let i = 1; i < data.months.length; i++) {
    const rs = series
      .filter((sr) => sr[i] != null && sr[i - 1] != null)
      .map((sr) => (1 + sr[i]! / 100) / (1 + sr[i - 1]! / 100) - 1);
    if (rs.length > 0) {
      const [mo, yr] = data.months[i].split(' ');
      out.set(`${mo} ${yr.slice(-2)}`, rs.reduce((a, b) => a + b, 0) / rs.length);
    }
  }
  return out;
}

/**
 * Replays the actual deposits/withdrawals (changes in total invested) into an
 * index and returns its simulated value after each month. Months without index
 * data earn 0%. Deposits are assumed mid-month, matching the TWR calculation.
 */
export function simulateDeposits(
  months: { month: string; invested: number }[],
  returns: Map<string, number>
): number[] {
  let value = 0;
  let prevInv = 0;
  return months.map(({ month, invested }) => {
    const r = returns.get(month) ?? 0;
    const flow = invested - prevInv;
    value = Math.max(0, value * (1 + r) + flow * (1 + r / 2));
    prevInv = invested;
    return value;
  });
}
