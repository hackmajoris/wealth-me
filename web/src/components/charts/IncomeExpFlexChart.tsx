import { useChart } from './useChart';
import { getChartDefaults, getChartColors, C } from '../../lib/chartDefaults';
import type { TooltipItem } from 'chart.js';

interface IncomeExpFlexChartProps {
  labels: string[];
  income: number[];
  expenses: number[];
  chartType: 'line' | 'bar';
}

export function IncomeExpFlexChart({
  labels,
  income,
  expenses,
  chartType,
}: IncomeExpFlexChartProps) {
  const ref = useChart({
    type: chartType,
    data: {
      labels,
      datasets: [
        {
          label: 'Net Income',
          data: income,
          borderColor: C.green,
          backgroundColor: chartType === 'line' ? C.green + '20' : C.green + 'aa',
          fill: chartType === 'line',
          borderWidth: chartType === 'line' ? 2 : 1,
          pointRadius: 0,
          tension: chartType === 'line' ? 0.4 : 0,
          borderRadius: chartType === 'bar' ? 4 : undefined,
        },
        {
          label: 'Expenses',
          data: expenses,
          borderColor: C.red,
          backgroundColor: chartType === 'line' ? C.red + '20' : C.red + 'aa',
          fill: chartType === 'line',
          borderWidth: chartType === 'line' ? 2 : 1,
          pointRadius: 0,
          tension: chartType === 'line' ? 0.4 : 0,
          borderRadius: chartType === 'bar' ? 4 : undefined,
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
            pointStyle: chartType === 'bar' ? 'rect' : 'line',
            usePointStyle: true,
          },
        },
        tooltip: {
          ...((getChartDefaults().plugins as Record<string, unknown>)['tooltip'] as object),
          mode: 'index',
          intersect: false,
          callbacks: {
            label: (ctx: TooltipItem<any>) =>
              ` ${ctx.dataset.label ?? ''}: ${Math.round(ctx.parsed.y ?? 0).toLocaleString()} lei`,
          },
        },
      },
      scales: {
        x: {
          ...getChartDefaults().scales?.['x'],
          ticks: {
            ...(getChartDefaults().scales?.['x'] as any)?.['ticks'],
            maxRotation: 45,
            minRotation: 45,
            maxTicksLimit: 999,
            autoSkipPadding: 2,
            font: { size: 8, family: 'Outfit' },
          } as any,
        } as any,
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
