import {
  Chart,
  type ChartOptions,
  type Plugin,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
  LineController,
  BarController,
  DoughnutController,
} from 'chart.js';

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
  LineController,
  BarController,
  DoughnutController
);

export interface KeyEvent {
  id: string;
  month: string;
  label: string;
  color: string;
  icon: string;
  desc: string;
}

export const KEY_EVENTS: KeyEvent[] = [
  {
    id: 'covid',
    month: 'Mar 2020',
    label: 'COVID Crash',
    color: '#f87171',
    icon: '↓',
    desc: 'Markets -35% in weeks',
  },
  {
    id: 'btcath',
    month: 'Nov 2021',
    label: 'BTC ATH',
    color: '#fbbf24',
    icon: '★',
    desc: 'BTC peaks at ~$69k',
  },
  {
    id: 'ftx',
    month: 'Nov 2022',
    label: 'FTX Collapse',
    color: '#f87171',
    icon: '↓',
    desc: 'FTX files for bankruptcy',
  },
  {
    id: 'etf',
    month: 'Jan 2024',
    label: 'Spot ETF',
    color: '#34d399',
    icon: '↑',
    desc: 'Bitcoin spot ETF approved',
  },
  {
    id: 'btc100k',
    month: 'Dec 2024',
    label: 'BTC $100k',
    color: '#a78bfa',
    icon: '★',
    desc: 'BTC hits $100k milestone',
  },
  {
    id: 'btcath2',
    month: 'Oct 2025',
    label: 'BTC ATH',
    color: '#fbbf24',
    icon: '★',
    desc: 'BTC peaks at ~$126k',
  },
  {
    id: 'btccrash',
    month: 'Jun 2026',
    label: 'BTC Crash',
    color: '#fbbf24',
    icon: '★',
    desc: 'BTC crash ~$59',
  },
];

export function buildAnnotations(labels: string[], showEvents: boolean): KeyEvent[] {
  return showEvents ? KEY_EVENTS.filter((ev) => labels.includes(ev.month)) : [];
}

// Custom annotation plugin (no external dep)
const wealthAnnotationsPlugin: Plugin = {
  id: 'wealthAnnotations',
  afterDraw(chart, _args, opts: Record<string, unknown>) {
    const events = opts['events'] as KeyEvent[] | undefined;
    if (!events || !events.length) return;
    const { ctx, scales } = chart;
    const x = scales['x'];
    const y = scales['y'];
    if (!x || !y) return;
    const numSlots = 4;
    const slotH = ((y.bottom - y.top) * 0.55) / numSlots;
    events.forEach((ev, evIndex) => {
      const labels = chart.data.labels as string[] | undefined;
      const idx = labels ? labels.indexOf(ev.month) : -1;
      if (idx === -1) return;
      try {
        const xPos = x.getPixelForValue(idx);
        ctx.save();
        ctx.strokeStyle = ev.color + '80';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(xPos, y.top);
        ctx.lineTo(xPos, y.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
        const label = ev.icon + ' ' + ev.label;
        ctx.font = '600 10px Outfit, sans-serif';
        const tw = ctx.measureText(label).width;
        const pad = 4;
        const lx = Math.min(xPos + 4, chart.width - tw - 12);
        const ly = y.top + 6 + (evIndex % numSlots) * slotH;
        const rw = tw + pad * 2,
          rh = 16,
          r = 3;
        const rx = lx - pad,
          ry = ly - pad;
        ctx.fillStyle = ev.color + '22';
        ctx.beginPath();
        ctx.moveTo(rx + r, ry);
        ctx.lineTo(rx + rw - r, ry);
        ctx.arcTo(rx + rw, ry, rx + rw, ry + r, r);
        ctx.lineTo(rx + rw, ry + rh - r);
        ctx.arcTo(rx + rw, ry + rh, rx + rw - r, ry + rh, r);
        ctx.lineTo(rx + r, ry + rh);
        ctx.arcTo(rx, ry + rh, rx, ry + rh - r, r);
        ctx.lineTo(rx, ry + r);
        ctx.arcTo(rx, ry, rx + r, ry, r);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = ev.color;
        ctx.fillText(label, lx, ly + 8);
        ctx.restore();
      } catch {
        /* skip */
      }
    });
  },
};

Chart.register(wealthAnnotationsPlugin);

export const C = {
  green: '#34d399',
  red: '#f87171',
  blue: '#60a5fa',
  purple: '#a78bfa',
  orange: '#fb923c',
  yellow: '#fbbf24',
  greenA: 'rgba(52,211,153,0.15)',
  blueA: 'rgba(96,165,250,0.15)',
  purpleA: 'rgba(167,139,250,0.15)',
};

export const chartDefaults: ChartOptions = {
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1a1a2e',
      titleColor: '#eeeef8',
      bodyColor: 'rgba(238,238,248,0.7)',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
      displayColors: false,
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(255,255,255,0.04)' },
      ticks: {
        color: 'rgba(238,238,248,0.35)',
        font: { size: 10, family: 'Outfit' },
        maxTicksLimit: 100,
        maxRotation: 45,
        minRotation: 45,
      },
      border: { display: false },
    },
    y: {
      grid: { color: 'rgba(255,255,255,0.04)' },
      ticks: {
        color: 'rgba(238,238,248,0.35)',
        font: { size: 10, family: 'JetBrains Mono' },
        maxTicksLimit: 5,
      },
      border: { display: false },
    },
  },
  animation: { duration: 350 },
  maintainAspectRatio: false,
  responsive: true,
};
