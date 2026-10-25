import { FONT_SANS } from '../../lib/fonts';
import { useChart } from './useChart';
import { getChartDefaults, getChartColors, type KeyEvent } from '../../lib/chartDefaults';
import type { TooltipItem } from 'chart.js';

interface Dataset {
  label: string;
  data: (number | null)[];
  color: string;
}

interface AreaChartProps {
  labels: string[];
  datasets: Dataset[];
  annotations?: KeyEvent[];
}

export function AreaChart({ labels, datasets, annotations }: AreaChartProps) {
  const ref = useChart({
    type: 'line',
    data: {
      labels,
      datasets: datasets.map((d, i) => ({
        label: d.label,
        data: d.data,
        borderColor: d.color,
        backgroundColor: d.color + '28',
        fill: i === 0 ? 'origin' : false,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.4,
      })),
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
            label: (ctx: TooltipItem<'line'>) =>
              `${ctx.dataset.label ?? 'Value'}: $${Math.round(ctx.parsed.y ?? 0).toLocaleString()}`,
          },
        },
        ...({ wealthAnnotations: { events: annotations ?? [] } } as Record<string, unknown>),
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
    },
  });
  return <canvas ref={ref} />;
}
