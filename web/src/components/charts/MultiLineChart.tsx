import { useChart } from './useChart';
import { chartDefaults, type KeyEvent } from '../../lib/chartDefaults';

interface Dataset {
  label: string;
  data: (number | null)[];
  color: string;
  dashed?: boolean;
}

interface MultiLineChartProps {
  labels: string[];
  datasets: Dataset[];
  annotations?: KeyEvent[];
}

export function MultiLineChart({ labels, datasets, annotations }: MultiLineChartProps) {
  const plugins = {
    ...chartDefaults.plugins,
    legend: {
      display: true, position: 'top' as const,
      labels: {
        color: 'rgba(238,238,248,0.55)',
        font: { size: 11, family: 'Outfit' },
        boxWidth: 20, pointStyle: 'line' as const, usePointStyle: true,
      },
    },
    tooltip: {
      ...(chartDefaults.plugins as Record<string, unknown>)['tooltip'] as object,
      mode: 'index' as const, intersect: false,
    },
  };

  const ref = useChart({
    type: 'line',
    data: {
      labels,
      datasets: datasets.map(d => ({
        label: d.label,
        data: d.data,
        borderColor: d.color,
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: d.color,
        tension: 0.4,
        borderDash: d.dashed ? [4, 3] : [],
      })),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options: {
      ...chartDefaults,
      interaction: { mode: 'index', intersect: false },
      plugins: { ...plugins, wealthAnnotations: { events: annotations ?? [] } } as typeof plugins,
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
            callback: (v: number | string) => Number(v) + '%',
          },
        },
      },
    } as never,
  });
  return <canvas ref={ref} />;
}
