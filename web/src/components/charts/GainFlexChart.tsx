import { BarChart } from './BarChart';
import { LineChart } from './LineChart';

interface GainFlexChartProps {
  labels: string[];
  data: number[];
  color: string;
  chartType: 'bar' | 'line';
}

export function GainFlexChart({ labels, data, color, chartType }: GainFlexChartProps) {
  if (chartType === 'line') {
    return <LineChart labels={labels} data={data} color={color} fill yLabel="Gain $" />;
  }
  return <BarChart labels={labels} data={data} color={color} tooltipLabel="Gain" />;
}
