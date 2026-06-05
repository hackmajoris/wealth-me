import { useChart } from './useChart';
import { chartDefaults } from '../../lib/chartDefaults';
import type { TooltipItem } from 'chart.js';

interface GroupedBarChartProps {
  labels: string[];
  dataset1: { label: string; data: number[]; color: string };
  dataset2: { label: string; data: number[]; color: string };
  medianLine?: number;
  showTrend?: boolean;
}

function linearRegression(data: number[]): number[] {
  const n = data.length;
  if (n < 2) return data.slice();
  const sumX = (n * (n - 1)) / 2;
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
  const sumY = data.reduce((a, b) => a + b, 0);
  const sumXY = data.reduce((acc, y, i) => acc + i * y, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return data.map((_, i) => Math.max(0, Math.round(slope * i + intercept)));
}

export function GroupedBarChart({
  labels,
  dataset1,
  dataset2,
  medianLine,
  showTrend,
}: GroupedBarChartProps) {
  const totals = dataset1.data.map((v, i) => v + (dataset2.data[i] ?? 0));
  const trendData = linearRegression(totals);

  const extraDatasets = [];
  if (medianLine !== undefined) {
    extraDatasets.push({
      type: 'line' as const,
      label: 'Median',
      data: labels.map(() => medianLine),
      borderColor: '#fbbf24',
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderDash: [5, 4],
      pointRadius: 0,
      pointHoverRadius: 0,
      tension: 0,
      order: 0,
    });
  }
  if (showTrend) {
    extraDatasets.push({
      type: 'line' as const,
      label: 'Trend',
      data: trendData,
      borderColor: '#34d399',
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderDash: [3, 3],
      pointRadius: 0,
      pointHoverRadius: 0,
      tension: 0,
      order: 0,
    });
  }

  const ref = useChart({
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: dataset1.label,
          data: dataset1.data,
          backgroundColor: dataset1.color + 'aa',
          borderColor: dataset1.color,
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: dataset2.label,
          data: dataset2.data,
          backgroundColor: dataset2.color + 'aa',
          borderColor: dataset2.color,
          borderWidth: 1,
          borderRadius: 4,
        },
        ...extraDatasets,
      ],
    },
    options: {
      ...chartDefaults,
      plugins: {
        ...chartDefaults.plugins,
        legend:
          extraDatasets.length > 0
            ? {
                display: true,
                position: 'top' as const,
                labels: {
                  color: 'rgba(238,238,248,0.55)',
                  font: { size: 10, family: 'Outfit' },
                  boxWidth: 20,
                  pointStyle: 'line' as const,
                  usePointStyle: true,
                },
              }
            : { display: false },
        tooltip: {
          ...((chartDefaults.plugins as Record<string, unknown>)['tooltip'] as object),
          mode: 'index',
          intersect: false,
          callbacks: {
            label: (ctx: TooltipItem<'bar'>) =>
              `${ctx.dataset.label}: $${Math.round(ctx.parsed.y ?? 0).toLocaleString()}`,
          },
        },
      },
      scales: {
        x: {
          ...chartDefaults.scales?.['x'],
          ticks: {
            ...((chartDefaults.scales?.['x'] as Record<string, unknown>)?.['ticks'] as object),
            maxRotation: 44,
            minRotation: 44,
            maxTicksLimit: 100,
          },
        },
        y: {
          ...chartDefaults.scales?.['y'],
          ticks: {
            ...((chartDefaults.scales?.['y'] as Record<string, unknown>)?.['ticks'] as object),
            callback: (v: number | string) => {
              const n = Number(v);
              return n >= 1000 ? (n / 1000).toFixed(0) + 'k' : n.toString();
            },
          },
        },
      },
    },
  });
  return <canvas ref={ref} />;
}
