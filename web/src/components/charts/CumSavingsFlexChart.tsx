import { useChart } from './useChart';
import { chartDefaults, C } from '../../lib/chartDefaults';
import type { TooltipItem } from 'chart.js';

interface CumSavingsFlexChartProps {
  labels: string[];
  data: number[];
  chartType: 'line' | 'bar';
}

export function CumSavingsFlexChart({ labels, data, chartType }: CumSavingsFlexChartProps) {
  const ref = useChart({
    type: chartType,
    data: {
      labels,
      datasets: [
        {
          label: 'Cumulative Savings',
          data,
          borderColor: C.green,
          backgroundColor: chartType === 'line' ? C.green + '18' : C.green + 'aa',
          fill: chartType === 'line',
          borderWidth: chartType === 'line' ? 2.5 : 1,
          pointRadius: 0,
          pointHoverRadius: chartType === 'line' ? 4 : 0,
          tension: chartType === 'line' ? 0.4 : 0,
          borderRadius: chartType === 'bar' ? 4 : undefined,
        },
      ],
    },
    options: {
      ...chartDefaults,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        ...chartDefaults.plugins,
        tooltip: {
          ...((chartDefaults.plugins as Record<string, unknown>)['tooltip'] as object),
          callbacks: {
            label: (ctx: TooltipItem<any>) =>
              ` Saved: ${Math.round(ctx.parsed.y ?? 0).toLocaleString()} lei`,
          },
        },
      },
      scales: {
        x: {
          ...chartDefaults.scales?.['x'],
          ticks: {
            ...(chartDefaults.scales?.['x'] as any)?.['ticks'],
            maxRotation: 45,
            minRotation: 45,
            maxTicksLimit: 999,
            autoSkipPadding: 2,
            font: { size: 8, family: 'Outfit' },
          } as any,
        } as any,
        y: {
          ...chartDefaults.scales?.['y'],
          ticks: {
            ...((chartDefaults.scales?.['y'] as Record<string, unknown>)?.['ticks'] as object),
            callback: (v: number | string) => (Number(v) / 1000).toFixed(0) + 'k',
          },
        },
      },
    },
  });
  return <canvas ref={ref} />;
}
