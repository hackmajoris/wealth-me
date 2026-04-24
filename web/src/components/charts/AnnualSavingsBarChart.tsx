import { useChart } from './useChart';
import { chartDefaults, C } from '../../lib/chartDefaults';
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
      labels: stats.map(s => String(s.year)),
      datasets: [
        {
          label: 'Avg. Rate',
          data: stats.map(s => s.avgRate),
          backgroundColor: C.green + 'bb',
          borderRadius: 4,
        },
        {
          type: 'line' as const,
          label: 'Target',
          data: stats.map(s => s.target),
          backgroundColor: 'transparent',
          borderColor: C.yellow,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
        },
      ],
    },
    options: {
      ...chartDefaults,
      plugins: {
        ...chartDefaults.plugins,
        legend: {
          display: true, position: 'top',
          labels: {
            color: 'rgba(238,238,248,0.55)',
            font: { size: 11, family: 'Outfit' },
            boxWidth: 16,
          },
        },
        tooltip: {
          ...(chartDefaults.plugins as Record<string, unknown>)['tooltip'] as object,
          mode: 'index', intersect: false,
          callbacks: {
            label: (ctx: TooltipItem<'bar'>) =>
              ` ${ctx.dataset.label ?? ''}: ${(ctx.parsed.y ?? 0).toFixed(1)}%`,
          },
        },
      },
      scales: {
        x: { ...chartDefaults.scales?.['x'] },
        y: {
          ...chartDefaults.scales?.['y'],
          ticks: {
            ...(chartDefaults.scales?.['y'] as Record<string, unknown>)?.['ticks'] as object,
            callback: (v: number | string) => Number(v) + '%',
          },
        },
      },
    },
  });
  return <canvas ref={ref} />;
}
