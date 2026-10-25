import { FONT_SANS } from '../../lib/fonts';
import { useChart } from './useChart';
import { getChartDefaults, getChartColors, C } from '../../lib/chartDefaults';
import { generateTrendLine } from '../../lib/polyfit';
import type { TooltipItem } from 'chart.js';

interface SavingsRateFlexChartProps {
  labels: string[];
  rates: number[];
  targets: number[];
  chartType: 'line' | 'bar';
}

export function SavingsRateFlexChart({
  labels,
  rates,
  targets,
  chartType,
}: SavingsRateFlexChartProps) {
  // Generate trend line (polynomial degree 2)
  const trendLine =
    rates.length > 1
      ? generateTrendLine(
          Array.from({ length: rates.length }, (_, i) => i),
          rates,
          2
        )
      : rates;

  const avgRate = rates.length > 0 ? rates.reduce((s, r) => s + r, 0) / rates.length : 0;
  const avgLine = rates.map(() => avgRate);

  const ref = useChart({
    type: chartType,
    data: {
      labels,
      datasets: [
        {
          label: 'Saving Rate',
          data: rates,
          borderColor: C.green,
          backgroundColor: chartType === 'line' ? C.green + '18' : C.green + 'aa',
          fill: chartType === 'line',
          borderWidth: chartType === 'line' ? 2.5 : 1,
          pointRadius: 0,
          pointHoverRadius: 5,
          tension: chartType === 'line' ? 0.4 : 0,
          borderRadius: chartType === 'bar' ? 4 : undefined,
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
          type: 'line' as const,
        },
        {
          label: `Average (${avgRate.toFixed(1)}%)`,
          data: avgLine,
          borderColor: C.purple,
          backgroundColor: 'transparent',
          borderDash: [2, 3],
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0,
          fill: false,
          type: 'line' as const,
        },
        ...(chartType === 'line'
          ? [
              {
                label: 'Trend',
                data: trendLine,
                borderColor: C.blue,
                backgroundColor: 'transparent',
                borderDash: [5, 4],
                borderWidth: 1.5,
                pointRadius: 0,
                tension: 0.4,
                fill: false,
              },
            ]
          : []),
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
            pointStyle: 'line',
            usePointStyle: true,
          },
        },
        tooltip: {
          ...((getChartDefaults().plugins as Record<string, unknown>)['tooltip'] as object),
          mode: 'index',
          intersect: false,
          callbacks: {
            label: (ctx: TooltipItem<any>) =>
              ` ${ctx.dataset.label ?? ''}: ${(ctx.parsed.y ?? 0).toFixed(1)}%`,
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
          min: 0,
          ticks: {
            ...((getChartDefaults().scales?.['y'] as Record<string, unknown>)?.['ticks'] as object),
            callback: (v: number | string) => Number(v) + '%',
          },
        },
      },
    },
  });
  return <canvas ref={ref} />;
}
