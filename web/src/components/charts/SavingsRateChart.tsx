import { useChart } from './useChart';
import { chartDefaults, C } from '../../lib/chartDefaults';
import type { TooltipItem } from 'chart.js';

interface SavingsRateChartProps {
  labels: string[];
  rates: number[];
  targets: number[];
}

export function SavingsRateChart({ labels, rates, targets }: SavingsRateChartProps) {
  const ref = useChart({
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Saving Rate',
          data: rates,
          borderColor: C.green,
          backgroundColor: C.green + '18',
          fill: true,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 5,
          tension: 0.4,
        },
        {
          label: 'Target',
          data: targets,
          borderColor: C.yellow,
          backgroundColor: 'transparent',
          borderDash: [5, 4],
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0,
          fill: false,
        },
      ],
    },
    options: {
      ...chartDefaults,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        ...chartDefaults.plugins,
        legend: {
          display: true, position: 'top',
          labels: {
            color: 'rgba(238,238,248,0.55)',
            font: { size: 11, family: 'Outfit' },
            boxWidth: 20, pointStyle: 'line', usePointStyle: true,
          },
        },
        tooltip: {
          ...(chartDefaults.plugins as Record<string, unknown>)['tooltip'] as object,
          mode: 'index', intersect: false,
          callbacks: {
            label: (ctx: TooltipItem<'line'>) =>
              ` ${ctx.dataset.label ?? ''}: ${(ctx.parsed.y ?? 0).toFixed(1)}%`,
          },
        },
      },
      scales: {
        x: { ...chartDefaults.scales?.['x'] },
        y: {
          ...chartDefaults.scales?.['y'],
          min: 0, max: 70,
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
