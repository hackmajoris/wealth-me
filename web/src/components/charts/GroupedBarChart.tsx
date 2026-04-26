import { useChart } from './useChart';
import { chartDefaults } from '../../lib/chartDefaults';
import type { TooltipItem } from 'chart.js';

interface GroupedBarChartProps {
  labels: string[];
  dataset1: { label: string; data: number[]; color: string };
  dataset2: { label: string; data: number[]; color: string };
}

export function GroupedBarChart({ labels, dataset1, dataset2 }: GroupedBarChartProps) {
  const ref = useChart({
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: dataset1.label,
          data: dataset1.data,
          backgroundColor: dataset1.color + 'aa',
          borderColor: dataset1.color,
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: dataset2.label,
          data: dataset2.data,
          backgroundColor: dataset2.color + 'aa',
          borderColor: dataset2.color,
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      ...chartDefaults,
      plugins: {
        ...chartDefaults.plugins,
        tooltip: {
          ...(chartDefaults.plugins as Record<string, unknown>)['tooltip'] as object,
          mode: 'index',
          intersect: false,
          callbacks: {
            label: (ctx: TooltipItem<'bar'>) =>
              `${ctx.dataset.label}: ${Math.round(ctx.parsed.y ?? 0).toLocaleString()}`,
          },
        },
      },
      scales: {
        x: {
          ...chartDefaults.scales?.['x'],
          ticks: {
            ...(chartDefaults.scales?.['x'] as Record<string, unknown>)?.['ticks'] as object,
            maxRotation: 44,
            minRotation: 44,
            maxTicksLimit: 100,
          },
        },
        y: {
          ...chartDefaults.scales?.['y'],
          ticks: {
            ...(chartDefaults.scales?.['y'] as Record<string, unknown>)?.['ticks'] as object,
            callback: (v: number | string) => {
              const n = Number(v);
              return n >= 1000 ? (n / 1000).toFixed(0) + 'k' : n.toString();
            },
          },
        },
      },
    },
  });
  return <canvas ref={ref} />;
}
