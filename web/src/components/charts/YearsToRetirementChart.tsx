import { FONT_SANS } from '../../lib/fonts';
import { useChart } from './useChart';
import { getChartDefaults, C } from '../../lib/chartDefaults';
import type { TooltipItem } from 'chart.js';

interface YearsToRetirementChartProps {
  labels: string[];
  years: (number | null)[];
}

export function YearsToRetirementChart({ labels, years }: YearsToRetirementChartProps) {
  const ref = useChart({
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Years to retirement',
          data: years,
          borderColor: C.purple,
          backgroundColor: C.purple + '18',
          fill: true,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.3,
          spanGaps: false,
        },
      ],
    },
    options: {
      ...getChartDefaults(),
      interaction: { mode: 'index', intersect: false },
      plugins: {
        ...getChartDefaults().plugins,
        legend: { display: false },
        tooltip: {
          ...((getChartDefaults().plugins as Record<string, unknown>)['tooltip'] as object),
          mode: 'index',
          intersect: false,
          callbacks: {
            label: (ctx: TooltipItem<'line'>) =>
              ctx.parsed.y == null ? ' Not reachable' : ` ${ctx.parsed.y.toFixed(1)} years`,
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
            font: { size: 8, family: FONT_SANS },
          } as any,
        } as any,
        y: {
          ...getChartDefaults().scales?.['y'],
          min: 0,
          ticks: {
            ...((getChartDefaults().scales?.['y'] as Record<string, unknown>)?.['ticks'] as object),
            callback: (v: number | string) => Number(v) + 'y',
          },
        },
      },
    },
  });
  return <canvas ref={ref} />;
}
