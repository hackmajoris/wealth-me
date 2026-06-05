import { useChart } from './useChart';
import { chartDefaults } from '../../lib/chartDefaults';
import type { TooltipItem } from 'chart.js';

interface LineChartProps {
  labels: string[];
  data: (number | null)[];
  color: string;
  fill?: boolean;
  yLabel?: string;
  mini?: boolean;
  isCurrency?: boolean;
  formatValue?: (v: number) => string;
}

export function LineChart({
  labels,
  data,
  color,
  fill,
  yLabel,
  mini,
  isCurrency = true,
  formatValue,
}: LineChartProps) {
  const colorA = color + '22';
  const ref = useChart({
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          data,
          borderColor: color,
          backgroundColor: fill ? colorA : 'transparent',
          fill: fill ?? false,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: color,
          tension: 0.4,
        },
      ],
    },
    options: {
      ...chartDefaults,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        ...chartDefaults.plugins,
        tooltip: {
          ...((chartDefaults.plugins as Record<string, unknown>)['tooltip'] as object),
          callbacks: {
            label: (ctx: TooltipItem<'line'>) => {
              const val = ctx.parsed.y ?? 0;
              const formatted = formatValue
                ? formatValue(val)
                : isCurrency
                  ? `$${Math.round(val).toLocaleString()}`
                  : `${Math.round(val * 10) / 10}%`;
              return `${yLabel ?? 'Value'}: ${formatted}`;
            },
          },
        },
      },
      scales: {
        x: {
          ...chartDefaults.scales?.['x'],
          display: !mini,
          ticks: {
            ...((chartDefaults.scales?.['x'] as Record<string, unknown>)?.['ticks'] as object),
            maxTicksLimit: mini ? 0 : 100,
            maxRotation: mini ? 0 : 44,
            minRotation: mini ? 0 : 44,
          },
        },
        y: {
          ...chartDefaults.scales?.['y'],
          display: !mini,
          ticks: {
            ...((chartDefaults.scales?.['y'] as Record<string, unknown>)?.['ticks'] as object),
            maxTicksLimit: mini ? 0 : 5,
            callback: (v: number | string) => {
              const n = Number(v);
              if (formatValue) return formatValue(n);
              if (isCurrency) return '$' + (n >= 1000 ? (n / 1000).toFixed(0) + 'k' : n);
              return n + '%';
            },
          },
        },
      },
    },
  });
  return <canvas ref={ref} />;
}
