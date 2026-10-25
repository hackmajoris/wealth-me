import { FONT_SANS } from '../../lib/fonts';
import { useChart } from './useChart';
import { getChartDefaults, getChartColors, C } from '../../lib/chartDefaults';
import type { TooltipItem } from 'chart.js';

interface ScenarioPathChartProps {
  labels: string[];
  base: number[];
  scenario: number[];
  baseTarget: number;
  scenarioTarget: number;
  fmt: (v: number | null) => string;
}

/** Portfolio paths for today's numbers vs the scenario, each against its own target. */
export function ScenarioPathChart({
  labels,
  base,
  scenario,
  baseTarget,
  scenarioTarget,
  fmt,
}: ScenarioPathChartProps) {
  const line = (label: string, data: number[], color: string, dashed = false) => ({
    label,
    data,
    borderColor: color,
    backgroundColor: 'transparent',
    borderWidth: dashed ? 1.5 : 2.5,
    borderDash: dashed ? [5, 4] : [],
    pointRadius: 0,
    pointHoverRadius: dashed ? 0 : 4,
    tension: 0.3,
  });

  const ref = useChart({
    type: 'line',
    data: {
      labels,
      datasets: [
        line('Today', base, C.blue),
        line('Scenario', scenario, C.green),
        line(
          'Target (today)',
          labels.map(() => baseTarget),
          C.blue,
          true
        ),
        line(
          'Target (scenario)',
          labels.map(() => scenarioTarget),
          C.green,
          true
        ),
      ],
    },
    options: {
      ...getChartDefaults(),
      // Rebuilt on every slider move; animating each rebuild makes it flicker.
      animation: false,
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
            label: (ctx: TooltipItem<'line'>) => ` ${ctx.dataset.label}: ${fmt(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        x: { ...getChartDefaults().scales?.['x'] } as any,
        y: {
          ...getChartDefaults().scales?.['y'],
          min: 0,
          ticks: {
            ...((getChartDefaults().scales?.['y'] as Record<string, unknown>)?.['ticks'] as object),
            callback: (v: number | string) => {
              const n = Number(v);
              return n >= 1_000_000
                ? (n / 1_000_000).toFixed(1) + 'M'
                : n >= 1000
                  ? (n / 1000).toFixed(0) + 'k'
                  : String(n);
            },
          },
        },
      },
    },
  });
  return <canvas ref={ref} />;
}
