import { useChart } from './useChart';
import { chartDefaults, type KeyEvent } from '../../lib/chartDefaults';
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
      ...chartDefaults,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        ...chartDefaults.plugins,
        legend: {
          display: true, position: 'top',
          labels: {
            color: 'rgba(238,238,248,0.55)',
            font: { size: 11, family: 'Outfit' },
            boxWidth: 20, pointStyle: 'line', usePointStyle: true,
          },
        },
        tooltip: {
          ...(chartDefaults.plugins as Record<string, unknown>)['tooltip'] as object,
          mode: 'index', intersect: false,
          callbacks: {
            label: (ctx: TooltipItem<'line'>) =>
              `${ctx.dataset.label ?? 'Value'}: $${Math.round(ctx.parsed.y ?? 0).toLocaleString()}`,
          },
        },
        ...({ wealthAnnotations: { events: annotations ?? [] } } as Record<string, unknown>),
      },
      scales: {
        x: {
          ...chartDefaults.scales?.['x'],
          ticks: {
            ...(chartDefaults.scales?.['x'] as Record<string, unknown>)?.['ticks'] as object,
            maxRotation: 44,
            minRotation: 44,
            maxTicksLimit: 100,
          },
        },
        y: {
          ...chartDefaults.scales?.['y'],
          ticks: {
            ...(chartDefaults.scales?.['y'] as Record<string, unknown>)?.['ticks'] as object,
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
