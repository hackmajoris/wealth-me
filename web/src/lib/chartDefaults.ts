import { FONT_SANS } from './fonts';
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

Chart.defaults.font.family = FONT_SANS;

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

// Chart labels use 2-digit years ("Mar 20"); events may use 4-digit ("Mar 2020").
const monthKey = (m: string) => {
  const [mo, yr] = m.split(' ');
  return `${mo} ${(yr ?? '').slice(-2)}`;
};
const eventIndex = (labels: string[], ev: KeyEvent) =>
  labels.findIndex((l) => monthKey(l) === monthKey(ev.month));

export function buildAnnotations(labels: string[], showEvents: boolean): KeyEvent[] {
  return showEvents ? KEY_EVENTS.filter((ev) => eventIndex(labels, ev) >= 0) : [];
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
      const idx = labels ? eventIndex(labels, ev) : -1;
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
        // Small cards: icon only, full labels need more height.
        const compact = y.bottom - y.top < 150;
        const label = compact ? ev.icon : ev.icon + ' ' + ev.label;
        ctx.font = `600 10px ${FONT_SANS}`;
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

function isLight() {
  return document.documentElement.dataset['theme'] === 'light';
}

export function getChartColors() {
  const light = isLight();
  return {
    legendColor: light ? 'rgba(15,15,18,0.55)' : 'rgba(238,238,248,0.55)',
    tickColor: light ? 'rgba(15,15,18,0.65)' : 'rgba(238,238,248,0.35)',
    gridColor: light ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)',
    tooltipBg: light ? '#ffffff' : '#1a1a2e',
    tooltipTitle: light ? '#0f0f12' : '#eeeef8',
    tooltipBody: light ? 'rgba(15,15,18,0.7)' : 'rgba(238,238,248,0.7)',
    tooltipBorder: light ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
    donutBorder: light ? '#f4f4f6' : '#12121f',
  };
}

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

export function getChartDefaults(): ChartOptions {
  const cc = getChartColors();
  return {
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: cc.tooltipBg,
        titleColor: cc.tooltipTitle,
        bodyColor: cc.tooltipBody,
        borderColor: cc.tooltipBorder,
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: { color: cc.gridColor },
        ticks: {
          color: cc.tickColor,
          font: { size: 10, family: FONT_SANS },
          maxTicksLimit: 100,
          maxRotation: 45,
          minRotation: 45,
        },
        border: { display: false },
      },
      y: {
        grid: { color: cc.gridColor },
        ticks: {
          color: cc.tickColor,
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
}

export const chartDefaults: ChartOptions = getChartDefaults();
