import { BarChart } from './BarChart';
import { LineChart } from './LineChart';

interface FlexBarChartProps {
  labels: string[];
  data: number[];
  color: string;
  chartType: 'bar' | 'line';
}

export function FlexBarChart({ labels, data, color, chartType }: FlexBarChartProps) {
  if (chartType === 'line') {
    return <LineChart labels={labels} data={data} color={color} fill yLabel="Invested $" />;
  }
  return <BarChart labels={labels} data={data} color={color} />;
}
