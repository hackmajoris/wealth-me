import { useChart } from './useChart';
import { chartDefaults } from '../../lib/chartDefaults';
import type { ChartConfiguration } from 'chart.js';

interface DonutChartProps {
  values: number[];
  colors: string[];
}

export function DonutChart({ values, colors }: DonutChartProps) {
  const config: ChartConfiguration<'doughnut'> = {
    type: 'doughnut',
    data: {
      labels: ['Crypto', 'Stocks'],
      datasets: [
        {
          data: values,
          backgroundColor: colors,
          borderColor: '#12121f',
          borderWidth: 3,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      cutout: '72%',
      maintainAspectRatio: false,
      responsive: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          ...((chartDefaults.plugins as Record<string, unknown>)['tooltip'] as object),
          callbacks: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            label: (ctx: any) => `${ctx.label}: ${ctx.parsed.toFixed(1)}%`,
          },
        },
      },
      animation: { duration: 400 },
    },
  };
  const ref = useChart(config);
  return <canvas ref={ref} className="donut-canvas" width={110} height={110} />;
}
