import { WealthData } from '../data/wealthData';

export const RANGES = ['1M', '3M', '6M', '1Y', '3Y', 'ALL'] as const;
export type Range = typeof RANGES[number];

export function sliceRange(range: Range, n: number = WealthData.N): { start: number; end: number } {
  const cuts: Record<Range, number> = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12, '3Y': 36, 'ALL': n };
  const count = Math.min(cuts[range] ?? n, n);
  const start = n - count;
  return { start, end: n };
}
