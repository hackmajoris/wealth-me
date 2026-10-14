export function fmt$(v: number | null | undefined, compact = false): string {
  if (v === null || v === undefined) return '—';
  if (compact && Math.abs(v) >= 1000) return '$' + (v / 1000).toFixed(1) + 'k';
  return '$' + Math.round(Math.abs(v)).toLocaleString() + (v < 0 ? ' (-)' : '');
}

export function fmtSign$(v: number | null): string {
  if (v === null) return '—';
  const s = v >= 0 ? '+' : '-';
  return s + '$' + Math.abs(Math.round(v)).toLocaleString();
}

/** Signed compact dollars, e.g. "-$34.7k" or "+$850". */
export function fmtSign$k(v: number | null): string {
  if (v === null) return '—';
  const s = v >= 0 ? '+' : '-';
  const a = Math.abs(v);
  return s + '$' + (a >= 1000 ? (a / 1000).toFixed(1) + 'k' : Math.round(a).toString());
}

/** Signed difference between two percentages, in percentage points. */
export function fmtPts(v: number | null): string {
  return v === null ? '—' : (v >= 0 ? '+' : '') + v.toFixed(1) + ' pts';
}

export function fmtPct(v: number | null): string {
  return v === null ? '—' : (v >= 0 ? '+' : '') + v.toFixed(1) + '%';
}

export function clsROI(v: number | null): string {
  return v === null ? 'neu' : v >= 0 ? 'pos' : 'neg';
}

export function RON(v: number | null): string {
  if (v === null) return '—';
  return (v >= 0 ? '' : '-') + Math.abs(Math.round(v)).toLocaleString() + ' lei';
}

export function RONsign(v: number | null): string {
  if (v === null) return '—';
  return (v >= 0 ? '+' : '-') + Math.abs(Math.round(v)).toLocaleString() + ' lei';
}

export function EUR(v: number | null): string {
  if (v === null) return '—';
  return '€' + Math.abs(Math.round(v)).toLocaleString();
}

export function EURsign(v: number | null): string {
  if (v === null) return '—';
  return (v >= 0 ? '+' : '-') + '€' + Math.abs(Math.round(v)).toLocaleString();
}

export function USD(v: number | null): string {
  if (v === null) return '—';
  return '$' + Math.abs(Math.round(v)).toLocaleString();
}

export function USDsign(v: number | null): string {
  if (v === null) return '—';
  return (v >= 0 ? '+' : '-') + '$' + Math.abs(Math.round(v)).toLocaleString();
}

export function getCurrencyFormatter(currency: string): (v: number | null) => string {
  switch (currency) {
    case 'EUR':
      return EUR;
    case 'USD':
      return USD;
    case 'RON':
    default:
      return RON;
  }
}

export function fmtCompact(currency: string, v: number | null): string {
  if (v === null || v === undefined) return '—';
  if (Math.abs(v) >= 1000) {
    switch (currency) {
      case 'EUR':
        return '€' + (v / 1000).toFixed(1) + 'k';
      case 'USD':
        return '$' + (v / 1000).toFixed(1) + 'k';
      case 'RON':
      default:
        return (v / 1000).toFixed(1) + 'k lei';
    }
  }
  return getCurrencyFormatter(currency)(v);
}

export function getCurrencySignFormatter(currency: string): (v: number | null) => string {
  switch (currency) {
    case 'EUR':
      return EURsign;
    case 'USD':
      return USDsign;
    case 'RON':
    default:
      return RONsign;
  }
}

export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  usdToRon: number,
  eurToRon: number
): number {
  if (from === to) return amount;

  // Convert to RON first as base currency
  let ronValue: number;
  if (from === 'RON') {
    ronValue = amount;
  } else if (from === 'USD') {
    ronValue = amount * usdToRon;
  } else if (from === 'EUR') {
    ronValue = amount * eurToRon;
  } else {
    return amount;
  }

  // Convert from RON to target currency
  if (to === 'RON') {
    return ronValue;
  } else if (to === 'USD') {
    return ronValue / usdToRon;
  } else if (to === 'EUR') {
    return ronValue / eurToRon;
  } else {
    return amount;
  }
}
