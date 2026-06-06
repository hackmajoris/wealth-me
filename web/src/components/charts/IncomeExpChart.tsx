import { useChart } from './useChart';
import { getChartDefaults, getChartColors, C } from '../../lib/chartDefaults';
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
          borderColor: C.green,
          backgroundColor: C.green + '20',
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
      ...getChartDefaults(),
      interaction: { mode: 'index', intersect: false },
      plugins: {
        ...getChartDefaults().plugins,
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: getChartColors().legendColor,
            font: { size: 11, family: 'Outfit' },
            boxWidth: 20,
            pointStyle: 'line',
            usePointStyle: true,
          },
        },
        tooltip: {
          ...((getChartDefaults().plugins as Record<string, unknown>)['tooltip'] as object),
          mode: 'index',
          intersect: false,
          callbacks: {
            label: (ctx: TooltipItem<'line'>) =>
              ` ${ctx.dataset.label ?? ''}: ${Math.round(ctx.parsed.y ?? 0).toLocaleString()} lei`,
          },
        },
      },
      scales: {
        x: { ...getChartDefaults().scales?.['x'] },
        y: {
          ...getChartDefaults().scales?.['y'],
          ticks: {
            ...((getChartDefaults().scales?.['y'] as Record<string, unknown>)?.['ticks'] as object),
            callback: (v: number | string) => (Number(v) / 1000).toFixed(0) + 'k lei',
          },
        },
      },
    },
  });
  return <canvas ref={ref} />;
}
