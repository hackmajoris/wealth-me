import { FONT_SANS } from '../../lib/fonts';
import { useChart } from './useChart';
import { getChartDefaults, getChartColors, C } from '../../lib/chartDefaults';
import type { TooltipItem } from 'chart.js';
import { fmtAxisK, getCurrencyFormatter, getCurrencySignFormatter } from '../../lib/formatters';

interface IncomeExpFlexChartProps {
  labels: string[];
  income: number[];
  expenses: number[];
  chartType: 'line' | 'bar';
  currency: string;
}

export function IncomeExpFlexChart({
  labels,
  income,
  expenses,
  chartType,
  currency,
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
            font: { size: 11, family: FONT_SANS },
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
            // Labels are "Jan 25" (monthly) or "25" (yearly); expand to a 4-digit year
            title: (items: TooltipItem<any>[]) =>
              String(items[0]?.label ?? '').replace(/(^|\s)(\d{2})$/, '$120$2'),
            label: (ctx: TooltipItem<any>) =>
              ` ${ctx.dataset.label ?? ''}: ${getCurrencyFormatter(currency)(ctx.parsed.y ?? 0)}`,
            footer: (items: TooltipItem<any>[]) => {
              const i = items[0]?.dataIndex;
              if (i === undefined) return '';
              const inc = income[i] ?? 0;
              const diff = inc - (expenses[i] ?? 0);
              const rate = inc !== 0 ? ` (${((diff / inc) * 100).toFixed(1)}%)` : '';
              return `Difference: ${getCurrencySignFormatter(currency)(diff)}${rate}`;
            },
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
            font: { size: 8, family: FONT_SANS },
          } as any,
        } as any,
        y: {
          ...getChartDefaults().scales?.['y'],
          ticks: {
            ...((getChartDefaults().scales?.['y'] as Record<string, unknown>)?.['ticks'] as object),
            callback: (v: number | string) => fmtAxisK(currency, v),
          },
        },
      },
    },
  });
  return <canvas ref={ref} />;
}
