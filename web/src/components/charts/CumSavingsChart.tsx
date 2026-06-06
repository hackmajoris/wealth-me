import { useChart } from './useChart';
import { getChartDefaults, C } from '../../lib/chartDefaults';
import type { TooltipItem } from 'chart.js';

interface CumSavingsChartProps {
  labels: string[];
  data: number[];
}

export function CumSavingsChart({ labels, data }: CumSavingsChartProps) {
  const ref = useChart({
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Cumulative Savings',
          data,
          borderColor: C.green,
          backgroundColor: C.green + '18',
          fill: true,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.4,
        },
      ],
    },
    options: {
      ...getChartDefaults(),
      interaction: { mode: 'index', intersect: false },
      plugins: {
        ...getChartDefaults().plugins,
        tooltip: {
          ...((getChartDefaults().plugins as Record<string, unknown>)['tooltip'] as object),
          callbacks: {
            label: (ctx: TooltipItem<'line'>) =>
              ` Saved: ${Math.round(ctx.parsed.y ?? 0).toLocaleString()} lei`,
          },
        },
      },
      scales: {
        x: { ...getChartDefaults().scales?.['x'] },
        y: {
          ...getChartDefaults().scales?.['y'],
          ticks: {
            ...((getChartDefaults().scales?.['y'] as Record<string, unknown>)?.['ticks'] as object),
            callback: (v: number | string) => (Number(v) / 1000).toFixed(0) + 'k',
          },
        },
      },
    },
  });
  return <canvas ref={ref} />;
}
