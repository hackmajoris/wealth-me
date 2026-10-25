import { FONT_SANS } from '../../lib/fonts';
import { useEffect, useRef } from 'react';
import { useChart } from './useChart';
import { getChartDefaults, getChartColors, type KeyEvent } from '../../lib/chartDefaults';
import type { TooltipItem } from 'chart.js';

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
  valueFormat?: 'percent' | 'number';
  chartType?: 'line' | 'bar';
}

export function MultiLineChart({
  labels,
  datasets,
  annotations,
  valueFormat = 'percent',
  chartType = 'line',
}: MultiLineChartProps) {
  const isBar = chartType === 'bar';
  const scrollRef = useRef<HTMLDivElement>(null);
  // Open scrolled to the newest months.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
  }, [isBar, labels.length]);
  const plugins = {
    ...getChartDefaults().plugins,
    legend: {
      display: true,
      position: 'top' as const,
      labels: {
        color: getChartColors().legendColor,
        font: { size: 11, family: FONT_SANS },
        boxWidth: 20,
        pointStyle: isBar ? ('rect' as const) : ('line' as const),
        usePointStyle: true,
      },
    },
    tooltip: {
      ...((getChartDefaults().plugins as Record<string, unknown>)['tooltip'] as object),
      mode: 'index' as const,
      intersect: false,
      callbacks: {
        label: (ctx: TooltipItem<'line' | 'bar'>) => {
          const value = ctx.parsed.y;
          if (value === null) return `${ctx.dataset.label}: —`;
          if (valueFormat === 'number')
            return `${ctx.dataset.label}: $${Math.round(value).toLocaleString()}`;
          return `${ctx.dataset.label}: ${value.toFixed(1)}%`;
        },
      },
    },
  };

  const ref = useChart({
    type: chartType,
    data: {
      labels,
      datasets: datasets.map((d) => ({
        label: d.label,
        data: d.data,
        borderColor: d.color,
        backgroundColor: isBar ? d.color + 'aa' : 'transparent',
        borderWidth: isBar ? 1 : 2,
        borderRadius: isBar ? 2 : undefined,
        // Use almost the whole month slot for the bars; default gaps make them too thin.
        categoryPercentage: isBar ? 0.92 : undefined,
        barPercentage: isBar ? 0.95 : undefined,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: d.color,
        tension: 0.4,
        borderDash: d.dashed && !isBar ? [4, 3] : [],
      })),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options: {
      ...getChartDefaults(),
      interaction: { mode: 'index', intersect: false },
      plugins: { ...plugins, wealthAnnotations: { events: annotations ?? [] } } as typeof plugins,
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
        },
        y: {
          ...getChartDefaults().scales?.['y'],
          ticks: {
            ...((getChartDefaults().scales?.['y'] as Record<string, unknown>)?.['ticks'] as object),
            callback: (v: number | string) => {
              const n = Number(v);
              if (valueFormat === 'number')
                return '$' + (n >= 1000 ? (n / 1000).toFixed(0) + 'k' : n.toString());
              return n + '%';
            },
          },
        },
      },
    } as never,
  });
  if (!isBar) return <canvas ref={ref} />;

  // Many grouped bars get too thin to read: give each bar ~12px and let the
  // chart scroll horizontally once that exceeds the available width.
  const minWidth = labels.length * datasets.length * 12 + 80;
  return (
    <div className="chart-scroll" ref={scrollRef}>
      <div className="chart-scroll-inner" style={{ width: `max(100%, ${minWidth}px)` }}>
        <canvas ref={ref} />
      </div>
    </div>
  );
}
