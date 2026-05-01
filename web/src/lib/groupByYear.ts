export type AggStrategy = 'sum' | 'last' | 'avg';

export function groupByYear(
  labels: string[],
  series: (number | null)[][],
  strategies: AggStrategy[],
): { years: string[]; grouped: (number | null)[][] } {
  const yearOrder: string[] = [];
  const yearIndices = new Map<string, number[]>();

  for (let i = 0; i < labels.length; i++) {
    const parts = labels[i].split(' ');
    const year = parts[parts.length - 1];
    if (!yearIndices.has(year)) {
      yearIndices.set(year, []);
      yearOrder.push(year);
    }
    yearIndices.get(year)!.push(i);
  }

  const grouped = series.map((s, si) => {
    const strategy = strategies[si] ?? 'last';
    return yearOrder.map(year => {
      const indices = yearIndices.get(year)!;
      const vals = indices.map(i => s[i]).filter((v): v is number => v !== null);
      if (vals.length === 0) return null;
      switch (strategy) {
        case 'sum': return vals.reduce((a, b) => a + b, 0);
        case 'avg': return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
        case 'last': return vals[vals.length - 1];
      }
    });
  });

  return { years: yearOrder, grouped };
}
