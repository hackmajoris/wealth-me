import { useChart } from './useChart';
import { chartDefaults, C } from '../../lib/chartDefaults';
import type { TooltipItem } from 'chart.js';

interface IncomeExpChartProps {
  labels: string[];
  income: number[];
  expenses: number[];
}

export function IncomeExpChart({ labels, income, expenses }: IncomeExpChartProps) {
  const ref = useChart({
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Net Income',
          data: income,
          borderColor: C.blue,
          backgroundColor: C.blue + '20',
          fill: true,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
        },
        {
          label: 'Expenses',
          data: expenses,
          borderColor: C.red,
          backgroundColor: C.red + '20',
          fill: true,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
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
              ` ${ctx.dataset.label ?? ''}: ${Math.round(ctx.parsed.y ?? 0).toLocaleString()} lei`,
          },
        },
      },
      scales: {
        x: { ...chartDefaults.scales?.['x'] },
        y: {
          ...chartDefaults.scales?.['y'],
          ticks: {
            ...(chartDefaults.scales?.['y'] as Record<string, unknown>)?.['ticks'] as object,
            callback: (v: number | string) => (Number(v) / 1000).toFixed(0) + 'k lei',
          },
        },
      },
    },
  });
  return <canvas ref={ref} />;
}
