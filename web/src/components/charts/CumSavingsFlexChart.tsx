import { FONT_SANS } from '../../lib/fonts';
import { useChart } from './useChart';
import { getChartDefaults, C } from '../../lib/chartDefaults';
import type { TooltipItem } from 'chart.js';
import { fmtAxisK, getCurrencyFormatter } from '../../lib/formatters';

interface CumSavingsFlexChartProps {
  labels: string[];
  data: number[];
  chartType: 'line' | 'bar';
  currency: string;
}

export function CumSavingsFlexChart({
  labels,
  data,
  chartType,
  currency,
}: CumSavingsFlexChartProps) {
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
      ...getChartDefaults(),
      interaction: { mode: 'index', intersect: false },
      plugins: {
        ...getChartDefaults().plugins,
        tooltip: {
          ...((getChartDefaults().plugins as Record<string, unknown>)['tooltip'] as object),
          callbacks: {
            label: (ctx: TooltipItem<any>) =>
              ` Saved: ${getCurrencyFormatter(currency)(ctx.parsed.y ?? 0)}`,
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
