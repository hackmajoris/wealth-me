import { useChart } from './useChart';
import { getChartDefaults, getChartColors, C } from '../../lib/chartDefaults';
import type { TooltipItem } from 'chart.js';

interface AnnualStat {
  year: number;
  portfolioRoi: number;
  cryptoRoi: number;
  stocksRoi: number | null;
  spxRoi: number | null;
}

interface YoYBarChartProps {
  stats: AnnualStat[];
}

export function YoYBarChart({ stats }: YoYBarChartProps) {
  const ref = useChart({
    type: 'bar',
    data: {
      labels: stats.map((s) => String(s.year)),
      datasets: [
        {
          label: 'Portfolio',
          data: stats.map((s) => s.portfolioRoi),
          backgroundColor: C.green + 'aa',
          borderRadius: 4,
        },
        {
          label: 'Crypto',
          data: stats.map((s) => s.cryptoRoi),
          backgroundColor: C.purple + 'aa',
          borderRadius: 4,
        },
        {
          label: 'Stocks',
          data: stats.map((s) => s.stocksRoi),
          backgroundColor: C.blue + 'aa',
          borderRadius: 4,
        },
        {
          label: 'S&P 500',
          data: stats.map((s) => s.spxRoi),
          backgroundColor: C.orange + '66',
          borderRadius: 4,
          borderColor: C.orange,
          borderWidth: 1,
        },
      ],
    },
    options: {
      ...getChartDefaults(),
      plugins: {
        ...getChartDefaults().plugins,
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: getChartColors().legendColor,
            font: { size: 11, family: 'Outfit' },
            boxWidth: 14,
            padding: 16,
          },
        },
        tooltip: {
          ...((getChartDefaults().plugins as Record<string, unknown>)['tooltip'] as object),
          mode: 'index',
          intersect: false,
          callbacks: {
            label: (ctx: TooltipItem<'bar'>) =>
              ` ${ctx.dataset.label ?? ''}: ${(ctx.parsed.y ?? 0).toFixed(1)}%`,
          },
        },
      },
      scales: {
        x: { ...getChartDefaults().scales?.['x'] },
        y: {
          ...getChartDefaults().scales?.['y'],
          ticks: {
            ...((getChartDefaults().scales?.['y'] as Record<string, unknown>)?.['ticks'] as object),
            callback: (v: number | string) => Number(v) + '%',
          },
          grid: { color: getChartColors().gridColor },
        },
      },
    },
  });
  return <canvas ref={ref} />;
}
