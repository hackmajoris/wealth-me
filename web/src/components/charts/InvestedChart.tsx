import { FONT_SANS } from '../../lib/fonts';
import type { TooltipItem } from 'chart.js';
import { getChartDefaults, getChartColors, C } from '../../lib/chartDefaults';
import { polyTrend, calcAverage } from '../../lib/trendUtils';
import { useChart } from './useChart';
import { MultiLineChart } from './MultiLineChart';

interface InvestedChartProps {
  labels: string[];
  data: number[];
  color: string;
  chartType: 'bar' | 'line';
}

/** Bar chart with average + polynomial trend overlay (bar mode),
 *  or MultiLineChart with all three series (line mode). */
export function InvestedChart({ labels, data, color, chartType }: InvestedChartProps) {
  const avg = calcAverage(data);
  const trend = polyTrend(data, 2);

  if (chartType === 'line') {
    return (
      <MultiLineChart
        valueFormat="number"
        labels={labels}
        datasets={[
          { label: 'Monthly', data, color },
          { label: 'Average', data: data.map(() => avg), color: C.orange, dashed: true },
          { label: 'Trend', data: trend, color: C.yellow },
        ]}
      />
    );
  }

  return <MixedBarChart labels={labels} data={data} color={color} avg={avg} trend={trend} />;
}

/** Chart.js mixed chart: bars for data + line overlays for average and trend. */
function MixedBarChart({
  labels,
  data,
  color,
  avg,
  trend,
}: {
  labels: string[];
  data: number[];
  color: string;
  avg: number;
  trend: number[];
}) {
  const ref = useChart({
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          type: 'bar' as const,
          label: 'Monthly',
          data,
          backgroundColor: color + 'aa',
          borderColor: color,
          borderWidth: 1,
          borderRadius: 4,
          order: 3,
        },
        {
          type: 'line' as const,
          label: 'Average',
          data: data.map(() => avg),
          borderColor: C.orange,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [4, 3],
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: C.orange,
          tension: 0,
          order: 1,
        },
        {
          type: 'line' as const,
          label: 'Trend',
          data: trend,
          borderColor: C.yellow,
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: C.yellow,
          tension: 0.4,
          order: 2,
        },
      ],
    },
    options: {
      ...getChartDefaults(),
      interaction: { mode: 'index' as const, intersect: false },
      plugins: {
        ...getChartDefaults().plugins,
        legend: {
          display: true,
          position: 'top' as const,
          labels: {
            color: getChartColors().legendColor,
            font: { size: 11, family: FONT_SANS },
            boxWidth: 20,
            pointStyle: 'line' as const,
            usePointStyle: true,
          },
        },
        tooltip: {
          ...((getChartDefaults().plugins as Record<string, unknown>)['tooltip'] as object),
          mode: 'index' as const,
          intersect: false,
          callbacks: {
            label: (ctx: TooltipItem<'bar'>) => {
              const v = ctx.parsed.y ?? 0;
              return `${ctx.dataset.label}: $${Math.round(v).toLocaleString()}`;
            },
          },
        },
      },
      scales: {
        x: {
          ...getChartDefaults().scales?.['x'],
          ticks: {
            ...((getChartDefaults().scales?.['x'] as Record<string, unknown>)?.['ticks'] as object),
            maxRotation: 44,
            minRotation: 44,
            maxTicksLimit: 100,
          },
        },
        y: {
          ...getChartDefaults().scales?.['y'],
          ticks: {
            ...((getChartDefaults().scales?.['y'] as Record<string, unknown>)?.['ticks'] as object),
            callback: (v: number | string) => {
              const n = Number(v);
              return '$' + (n >= 1000 ? (n / 1000).toFixed(0) + 'k' : n);
            },
          },
        },
      },
    } as never,
  });

  return <canvas ref={ref} />;
}
