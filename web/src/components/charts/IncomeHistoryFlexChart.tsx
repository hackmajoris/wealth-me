import { useChart } from './useChart';
import { chartDefaults, C } from '../../lib/chartDefaults';
import { MultiLineChart } from './MultiLineChart';
import { generateTrendLine } from '../../lib/polyfit';
import type { TooltipItem } from 'chart.js';

interface IncomeHistoryFlexChartProps {
  labels: string[];
  income: number[];
  chartType: 'line' | 'bar';
  formatValue?: (v: number) => string;
}

export function IncomeHistoryFlexChart({
  labels,
  income,
  chartType,
  formatValue,
}: IncomeHistoryFlexChartProps) {
  const fmt = formatValue ?? ((v: number) => v.toLocaleString());
  const trendLine =
    income.length > 1
      ? generateTrendLine(
          Array.from({ length: income.length }, (_, i) => i),
          income,
          2
        )
      : income;

  if (chartType === 'line') {
    return (
      <MultiLineChart
        labels={labels}
        datasets={[
          { label: 'Income', data: income, color: C.green },
          { label: 'Trend', data: trendLine, color: C.blue, dashed: true },
        ]}
      />
    );
  }

  const ref = useChart({
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Income',
          data: income,
          backgroundColor: C.green + 'aa',
          borderColor: C.green,
          borderWidth: 1,
          borderRadius: 4,
          yAxisID: 'y',
          pointStyle: 'rect' as const,
        },
        {
          label: 'Trend',
          data: trendLine,
          borderColor: C.blue,
          backgroundColor: 'transparent',
          borderDash: [5, 4],
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0.4,
          type: 'line' as const,
          yAxisID: 'y',
          pointStyle: 'line' as const,
        },
      ],
    },
    options: {
      ...chartDefaults,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        ...chartDefaults.plugins,
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: 'rgba(238,238,248,0.55)',
            font: { size: 11, family: 'Outfit' },
            boxWidth: 20,
            usePointStyle: true,
            pointStyle: 'line',
          },
        },
        tooltip: {
          ...((chartDefaults.plugins as Record<string, unknown>)['tooltip'] as object),
          mode: 'index',
          intersect: false,
          callbacks: {
            label: (ctx: TooltipItem<any>) =>
              ` ${ctx.dataset.label ?? ''}: ${fmt(ctx.parsed.y ?? 0)}`,
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
            callback: (v: number | string) => fmt(Number(v)),
          },
        },
      },
    },
  });

  return <canvas ref={ref} />;
}
