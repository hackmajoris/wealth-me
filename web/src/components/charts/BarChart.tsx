import { useChart } from './useChart';
import { getChartDefaults } from '../../lib/chartDefaults';
import type { TooltipItem } from 'chart.js';

interface BarChartProps {
  labels: string[];
  data: number[];
  color: string;
  tooltipLabel?: string;
}

export function BarChart({ labels, data, color, tooltipLabel = 'Invested' }: BarChartProps) {
  const ref = useChart({
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: color + 'aa',
          borderColor: color,
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      ...getChartDefaults(),
      plugins: {
        ...getChartDefaults().plugins,
        tooltip: {
          ...((getChartDefaults().plugins as Record<string, unknown>)['tooltip'] as object),
          callbacks: {
            label: (ctx: TooltipItem<'bar'>) =>
              `${tooltipLabel}: $${Math.round(ctx.parsed.y ?? 0).toLocaleString()}`,
          },
        },
      },
      scales: {
        x: {
          ...getChartDefaults().scales?.['x'],
          ticks: {
            ...((getChartDefaults().scales?.['x'] as Record<string, unknown>)?.['ticks'] as object),
            maxRotation: 44,
            minRotation: 44,
            maxTicksLimit: 100,
          },
        },
        y: {
          ...getChartDefaults().scales?.['y'],
          ticks: {
            ...((getChartDefaults().scales?.['y'] as Record<string, unknown>)?.['ticks'] as object),
            callback: (v: number | string) => {
              const n = Number(v);
              return '$' + (n >= 1000 ? (n / 1000).toFixed(0) + 'k' : n);
            },
          },
        },
      },
    },
  });
  return <canvas ref={ref} />;
}
