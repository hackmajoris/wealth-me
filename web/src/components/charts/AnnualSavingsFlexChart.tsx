import { FONT_SANS } from '../../lib/fonts';
import { useChart } from './useChart';
import { getChartDefaults, getChartColors, C } from '../../lib/chartDefaults';
import { MultiLineChart } from './MultiLineChart';
import { generateTrendLine } from '../../lib/polyfit';
import type { TooltipItem } from 'chart.js';

interface AnnualSavingsFlexChartProps {
  stats: Array<{
    year: number;
    months: number;
    totalInc: number;
    totalExp: number;
    totalSav: number;
    avgRate: number;
    target: number;
    vsTarget: number;
    monthlyAvgInc: number;
    monthlyAvgSav: number;
    mo?: string;
  }>;
  chartType: 'bar' | 'line';
}

export function AnnualSavingsFlexChart({ stats, chartType }: AnnualSavingsFlexChartProps) {
  const labels = stats.map((s) =>
    s.mo ? `${s.mo} ${String(s.year).slice(2)}` : String(s.year)
  );
  const rates = stats.map((s) => s.avgRate);
  const overallAverage = stats.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
  const averageLine = rates.map(() => overallAverage);

  // Generate trend line (polynomial degree 2)
  const trendLine =
    stats.length > 1
      ? generateTrendLine(
          Array.from({ length: rates.length }, (_, i) => i),
          rates,
          2
        )
      : rates;

  if (chartType === 'line') {
    return (
      <MultiLineChart
        labels={labels}
        datasets={[
          { label: 'Avg Rate', data: rates, color: C.green },
          { label: 'Trend', data: trendLine, color: C.blue, dashed: true },
          { label: 'Average', data: averageLine, color: C.yellow, dashed: true },
        ]}
      />
    );
  }

  // Bar chart with average line overlay
  const ref = useChart({
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Avg Rate',
          data: rates,
          backgroundColor: C.green + 'aa',
          borderColor: C.green,
          borderWidth: 1,
          borderRadius: 4,
          yAxisID: 'y',
          pointStyle: 'line' as const,
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
        {
          label: 'Average',
          data: averageLine,
          borderColor: C.yellow,
          backgroundColor: 'transparent',
          borderDash: [5, 4],
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0,
          type: 'line' as const,
          yAxisID: 'y',
          pointStyle: 'line' as const,
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
            usePointStyle: true,
            pointStyle: 'line',
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
