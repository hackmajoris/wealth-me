import { FONT_SANS } from '../../lib/fonts';
import { useChart } from './useChart';
import { getChartDefaults, getChartColors, C } from '../../lib/chartDefaults';
import type { TooltipItem } from 'chart.js';

interface AnnualStat {
  year: number;
  avgRate: number;
  target: number;
}

interface AnnualSavingsBarChartProps {
  stats: AnnualStat[];
}

export function AnnualSavingsBarChart({ stats }: AnnualSavingsBarChartProps) {
  const ref = useChart({
    type: 'bar',
    data: {
      labels: stats.map((s) => String(s.year)),
      datasets: [
        {
          label: 'Avg. Rate',
          data: stats.map((s) => s.avgRate),
          backgroundColor: C.green + 'bb',
          borderRadius: 4,
        },
        {
          type: 'line' as const,
          label: 'Target',
          data: stats.map((s) => s.target),
          backgroundColor: 'transparent',
          borderColor: C.yellow,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
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
            font: { size: 11, family: FONT_SANS },
            boxWidth: 16,
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
        },
      },
    },
  });
  return <canvas ref={ref} />;
}
