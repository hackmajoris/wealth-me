// In-browser stand-in for the Go API, used by demo builds (VITE_DEMO=true).
// Mirrors the server handlers in pkg/ — ordering, aggregation and error codes —
// over an in-memory dataset. Changes live until the page is reloaded.

import { ApiError } from '../api';
import type {
  Api,
  AssetEntry,
  BenchmarkData,
  CryptoData,
  DebtEntry,
  Section,
  SectionId,
  StockData,
  YearlyBenchmark,
} from '../api';
import type { Entry, SavingsEntry, Asset, Debt } from '../storage';
import { generateDemoData, monthLabel, sqliteNow, MO, MO_FULL, type DemoData } from './data';

let db: DemoData | undefined;
const nextId: Record<string, number> = {};

// Lazily seeded so importing this module has no side effects (keeps it
// tree-shakeable out of the regular build).
function store(): DemoData {
  if (!db) {
    db = generateDemoData();
    for (const k of [
      'entries',
      'savings',
      'assets',
      'assetEntries',
      'debts',
      'debtEntries',
    ] as const) {
      nextId[k] = Math.max(0, ...db[k].map((r) => r.id)) + 1;
    }
  }
  return db;
}

function newId(table: keyof typeof nextId): number {
  return nextId[table]!++;
}

// Responses are copies so callers can't mutate the store by accident.
function respond<T>(v: T): Promise<T> {
  return Promise.resolve(v === undefined ? v : (structuredClone(v) as T));
}

// Mirrors pkg/settings/sections.go: zero rows don't count as data.
const SECTION_IDS: SectionId[] = ['stocks', 'crypto', 'savings', 'assets', 'debts'];

function sections(): Section[] {
  const d = store();
  const disabled = (d.settings.strings['disabled_sections'] ?? '').split(',');
  const counts: Record<SectionId, number> = {
    stocks: d.entries.filter((e) => e.stocksInvested !== 0 || e.stocksReturn !== 0).length,
    crypto: d.entries.filter((e) => e.cryptoInvested !== 0 || e.cryptoReturn !== 0).length,
    savings: d.savings.filter((e) => e.netIncome !== 0 || e.totalExpenses !== 0).length,
    assets: d.assets.length + d.assetEntries.filter((e) => e.amount !== 0).length,
    debts: d.debts.length + d.debtEntries.filter((e) => e.amount !== 0).length,
  };
  return SECTION_IDS.map((id) => ({
    id,
    enabled: !disabled.includes(id),
    entries: counts[id],
    canDisable: counts[id] === 0,
  }));
}

const notFound = () => new ApiError(404, '404 page not found\n');
const unique = (table: string, cols: string) =>
  new ApiError(
    500,
    `UNIQUE constraint failed: ${cols
      .split(',')
      .map((c) => `${table}.${c}`)
      .join(', ')}`
  );

function findOr404<T extends { id: number }>(rows: T[], id: number): T {
  const row = rows.find((r) => r.id === id);
  if (!row) throw notFound();
  return row;
}

function removeOr404<T extends { id: number }>(rows: T[], id: number): void {
  const i = rows.findIndex((r) => r.id === id);
  if (i < 0) throw notFound();
  rows.splice(i, 1);
}

// ── Ordering helpers (match the SQL ORDER BY clauses) ────────────────────────

const moNum = (mo: string) => MO.indexOf(mo) + 1;
const byYearMonth = (a: { yr: number; mo: string }, b: { yr: number; mo: string }) =>
  a.yr - b.yr || moNum(a.mo) - moNum(b.mo);

// Sort key for asset/debt entry dates: "2025-03-01" or "Mar 25" / "Mar 2025".
function dateKey(date: string): string {
  if (date[4] === '-') return date;
  const yr = date.slice(4).trim();
  const mo = String(moNum(date.slice(0, 3))).padStart(2, '0');
  return `${yr.length === 2 ? '20' + yr : yr}-${mo === '00' ? '00' : mo}-01`;
}

function sortEntriesDesc<T extends { date: string; id: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => dateKey(b.date).localeCompare(dateKey(a.date)) || a.id - b.id);
}

function historyOf<K extends string>(rows: { date: string; amount: number }[], key: K) {
  const totals = new Map<string, number>();
  for (const r of rows) totals.set(r.date, (totals.get(r.date) ?? 0) + r.amount);
  return [...totals.entries()]
    .sort(([a], [b]) => dateKey(a).localeCompare(dateKey(b)))
    .map(([date, total]) => ({ date, [key]: total }) as { date: string } & Record<K, number>);
}

// ── Stocks / crypto aggregation (pkg/stocks, pkg/crypto) ─────────────────────

function aggregate(list: Entry[], kind: 'stocks' | 'crypto'): StockData | CryptoData {
  const inv = (e: Entry) => (kind === 'stocks' ? e.stocksInvested : e.cryptoInvested);
  const ret = (e: Entry) => (kind === 'stocks' ? e.stocksReturn : e.cryptoReturn);
  if (list.length === 0) {
    return {
      months: [],
      invested: [],
      return: [],
      gain: [],
      roi: [],
      allocation: [],
      currentValue: 0,
      totalRoi: null,
    };
  }
  const last = list[list.length - 1]!;
  return {
    months: list.map((e) => e.month),
    invested: list.map(inv),
    return: list.map(ret),
    gain: list.map((e) => ret(e) - inv(e)),
    roi: list.map((e) => (inv(e) > 0 ? ((ret(e) - inv(e)) / inv(e)) * 100 : null)),
    allocation: list.map((e) => {
      const total = e.stocksReturn + e.cryptoReturn;
      return total > 0 ? (ret(e) / total) * 100 : 0;
    }),
    currentValue: ret(last),
    totalRoi: inv(last) > 0 ? ((ret(last) - inv(last)) / inv(last)) * 100 : null,
  };
}

// ── Benchmarks (pkg/benchmarks) ──────────────────────────────────────────────

const SYMBOLS = { spx: '^GSPC', nasdaq: '^IXIC', vwce: 'VWCE.DE' } as const;

function benchmarks(list: Entry[], closes: Record<string, number>): BenchmarkData {
  const yms = [
    ...new Map(
      list.filter((e) => moNum(e.mo) > 0).map((e) => [`${e.yr}|${moNum(e.mo)}`, e])
    ).values(),
  ]
    .map((e) => ({ yr: e.yr, mo: moNum(e.mo) }))
    .sort((a, b) => a.yr - b.yr || a.mo - b.mo);
  if (yms.length === 0)
    return { months: [], spxRoi: [], nasdaqRoi: [], vwceRoi: [], yearlyBenchmarks: {} };

  const close = (sym: string, yr: number, mo: number) => closes[`${sym}|${yr}|${mo}`] ?? 0;
  const cumulative = (sym: string) => {
    let base = 0;
    return yms.map(({ yr, mo }) => {
      const c = close(sym, yr, mo);
      if (base === 0) base = c;
      return c > 0 && base > 0 ? ((c - base) / base) * 100 : null;
    });
  };

  const now = new Date();
  const curYr = now.getFullYear();
  const yearly = (sym: string, yr: number) => {
    const prevDec = close(sym, yr - 1, 12);
    let end = 0;
    if (yr < curYr) end = close(sym, yr, 12);
    else for (let mo = now.getMonth() + 1; mo >= 1 && end === 0; mo--) end = close(sym, yr, mo);
    return end > 0 && prevDec > 0 ? (end / prevDec - 1) * 100 : null;
  };

  const yearlyBenchmarks: Record<string, YearlyBenchmark> = {};
  for (const yr of new Set(yms.map((k) => k.yr))) {
    yearlyBenchmarks[String(yr)] = {
      spxReturn: yearly(SYMBOLS.spx, yr),
      nasdaqReturn: yearly(SYMBOLS.nasdaq, yr),
      vwceReturn: yearly(SYMBOLS.vwce, yr),
    };
  }

  return {
    months: yms.map(({ yr, mo }) => `${MO[mo - 1]} ${yr}`),
    spxRoi: cumulative(SYMBOLS.spx),
    nasdaqRoi: cumulative(SYMBOLS.nasdaq),
    vwceRoi: cumulative(SYMBOLS.vwce),
    yearlyBenchmarks,
  };
}

// ── CSV import (pkg/upload) ──────────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c !== ''));
}

interface CSVRow {
  line: number;
  get: (col: string) => string;
  num: (col: string) => number;
  month: () => { yr: number; yrStr: string; moIdx: number; monthName: string };
}

async function readCSV(file: File, required: string[]): Promise<CSVRow[]> {
  const records = parseCSV(await file.text());
  if (records.length < 2) {
    throw new ApiError(400, 'csv must contain a header row and at least one data row');
  }
  const idx = new Map(records[0]!.map((h, i) => [h, i]));
  for (const col of required) {
    if (!idx.has(col)) throw new ApiError(400, `missing required column: ${col}`);
  }
  return records.slice(1).map((rec, i) => {
    const line = i + 2;
    const get = (col: string) => (rec[idx.get(col) ?? -1] ?? '').trim();
    return {
      line,
      get,
      num: (col) => {
        const raw = get(col).replace(/,/g, '');
        const n = Number(raw);
        if (raw === '' || Number.isNaN(n)) throw new ApiError(400, `row ${line}: invalid ${col}`);
        return n;
      },
      month: () => {
        const monthName = get('month');
        const yrStr = get('year');
        const yr = Number.parseInt(yrStr, 10);
        if (!/^-?\d+$/.test(yrStr)) throw new ApiError(400, `row ${line}: invalid year "${yrStr}"`);
        const moIdx = MO_FULL.indexOf(monthName);
        if (moIdx < 0) throw new ApiError(400, `row ${line}: invalid month "${monthName}"`);
        return { yr, yrStr, moIdx, monthName };
      },
    };
  });
}

function csvDataURL(rows: string[][]): string {
  return (
    'data:text/csv;charset=utf-8,' +
    encodeURIComponent(rows.map((r) => r.join(',')).join('\n') + '\n')
  );
}

function upsertDated<T extends { id: number; date: string; name: string }>(
  rows: T[],
  table: 'assetEntries' | 'debtEntries',
  row: Omit<T, 'id'>
): void {
  const existing = rows.find((r) => r.date === row.date && r.name === row.name);
  if (existing) Object.assign(existing, row, { id: existing.id });
  else rows.push({ ...row, id: newId(table) } as T);
}

// Turn synchronous throws into rejected promises, like a failed fetch would.
function rejecting<T extends object>(obj: T): T {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'function') {
      (obj as Record<string, unknown>)[k] = (...args: unknown[]) => {
        try {
          return (v as (...a: unknown[]) => unknown)(...args);
        } catch (err) {
          return Promise.reject(err);
        }
      };
    } else if (v && typeof v === 'object') {
      rejecting(v as object);
    }
  }
  return obj;
}

// ── Public surface (same shape as the real api) ──────────────────────────────

export const mockApi: Api = /* @__PURE__ */ rejecting<Api>({
  entries: {
    list: () => respond([...store().entries].sort(byYearMonth)),
    get: (id) => respond(findOr404(store().entries, id)),
    create: (body) => {
      const rows = store().entries;
      if (rows.some((r) => r.yr === body.yr && r.mo === body.mo)) throw unique('entries', 'yr,mo');
      const e: Entry = { ...body, id: newId('entries'), createdAt: sqliteNow() };
      rows.push(e);
      return respond(e);
    },
    update: (id, body) => respond(Object.assign(findOr404(store().entries, id), body)),
    remove: (id) => respond(removeOr404(store().entries, id)),
  },

  savings: {
    list: () => respond([...store().savings].sort(byYearMonth)),
    get: (id) => respond(findOr404(store().savings, id)),
    create: (body) => {
      const rows = store().savings;
      if (rows.some((r) => r.yr === body.yr && r.mo === body.mo)) throw unique('savings', 'yr,mo');
      const e: SavingsEntry = { ...body, id: newId('savings'), updatedAt: sqliteNow() };
      rows.push(e);
      return respond(e);
    },
    update: (id, body) =>
      respond(Object.assign(findOr404(store().savings, id), body, { updatedAt: sqliteNow() })),
    remove: (id) => respond(removeOr404(store().savings, id)),
  },

  upload: {
    csv: async (file) => {
      const rows = await readCSV(file, [
        'month',
        'year',
        'cryptoInvested',
        'cryptoReturn',
        'stockInvested',
        'stockReturn',
      ]);
      const list = store().entries;
      const imported: Entry[] = [];
      for (const r of rows) {
        const { yr, moIdx, monthName, yrStr } = r.month();
        const values = {
          cryptoInvested: r.num('cryptoInvested'),
          cryptoReturn: r.num('cryptoReturn'),
          stocksInvested: r.num('stockInvested'),
          stocksReturn: r.num('stockReturn'),
        };
        const note = r.get('note');
        let e = list.find((x) => x.yr === yr && x.mo === MO[moIdx]);
        if (e) {
          // Server upsert only overwrites the stocks columns and note on conflict.
          Object.assign(e, {
            stocksInvested: values.stocksInvested,
            stocksReturn: values.stocksReturn,
            note,
          });
        } else {
          e = {
            id: newId('entries'),
            month: monthLabel(yr, moIdx),
            monthFull: `${monthName} ${yrStr}`,
            yr,
            mo: MO[moIdx]!,
            ...values,
            note,
            createdAt: sqliteNow(),
          };
          list.push(e);
        }
        imported.push(e);
      }
      return respond(imported);
    },
    csvTemplateURL: () =>
      csvDataURL([
        ['month', 'year', 'cryptoInvested', 'cryptoReturn', 'stockInvested', 'stockReturn', 'note'],
        ['September', '2021', '2452', '1716', '0', '0', ''],
      ]),
    savingsCsv: async (file) => {
      const rows = await readCSV(file, ['month', 'year', 'netIncome', 'totalExpenses']);
      const list = store().savings;
      const imported: SavingsEntry[] = [];
      for (const r of rows) {
        const { yr, moIdx, monthName, yrStr } = r.month();
        const netIncome = r.num('netIncome');
        const totalExpenses = r.num('totalExpenses');
        const note = r.get('note');
        let e = list.find((x) => x.yr === yr && x.mo === MO[moIdx]);
        if (e) {
          // Server upsert keeps the stored savings/rate/target on conflict.
          Object.assign(e, { netIncome, totalExpenses, note, updatedAt: sqliteNow() });
        } else {
          const saved = netIncome - totalExpenses;
          e = {
            id: newId('savings'),
            month: monthLabel(yr, moIdx),
            monthFull: `${monthName} ${yrStr}`,
            yr,
            mo: MO[moIdx]!,
            netIncome,
            totalExpenses,
            savings: saved,
            savingRate: netIncome > 0 ? (saved / netIncome) * 100 : 0,
            target: 0,
            note,
            updatedAt: sqliteNow(),
          };
          list.push(e);
        }
        imported.push(e);
      }
      return respond(imported);
    },
    savingsCsvTemplateURL: () =>
      csvDataURL([
        ['month', 'year', 'netIncome', 'totalExpenses', 'note'],
        ['September', '2021', '5000', '3500', ''],
      ]),
    assetHistoryCsv: async (file) => {
      const rows = await readCSV(file, ['month', 'year', 'name', 'type', 'amount']);
      for (const r of rows) {
        const { yr, moIdx } = r.month();
        const name = r.get('name');
        if (!name) throw new ApiError(400, `row ${r.line}: name is required`);
        upsertDated<AssetEntry>(store().assetEntries, 'assetEntries', {
          date: monthLabel(yr, moIdx),
          name,
          category: r.get('type'),
          amount: r.num('amount'),
          note: '',
          createdAt: sqliteNow(),
        });
      }
      return respond({ imported: rows.length });
    },
    assetHistoryCsvTemplateURL: () =>
      csvDataURL([
        ['month', 'year', 'name', 'type', 'amount'],
        ['September', '2021', 'Primary House', 'Real Estate', '150000'],
        ['September', '2021', 'Car', 'Vehicle', '25000'],
      ]),
    debtHistoryCsv: async (file) => {
      const rows = await readCSV(file, ['month', 'year', 'totalDebt']);
      for (const r of rows) {
        const { yr, moIdx } = r.month();
        upsertDated<DebtEntry>(store().debtEntries, 'debtEntries', {
          date: monthLabel(yr, moIdx),
          name: 'Historical',
          category: 'Historical',
          amount: r.num('totalDebt'),
          currency: 'RON',
          note: '',
          createdAt: sqliteNow(),
        });
      }
      return respond({ imported: rows.length });
    },
    debtHistoryCsvTemplateURL: () =>
      csvDataURL([
        ['month', 'year', 'totalDebt'],
        ['September', '2021', '25000'],
      ]),
  },

  stocks: { get: () => respond(aggregate([...store().entries].sort(byYearMonth), 'stocks')) },
  crypto: { get: () => respond(aggregate([...store().entries].sort(byYearMonth), 'crypto')) },

  settings: {
    getSavingsTarget: () =>
      respond({ key: 'savings_target', value: store().settings.numbers['savings_target'] ?? 30 }),
    setSavingsTarget: (value) => {
      store().settings.numbers['savings_target'] = value;
      return respond({ key: 'savings_target', value });
    },
    getCurrency: () =>
      respond({ key: 'currency', value: store().settings.strings['currency'] ?? 'RON' }),
    setCurrency: (value) => {
      store().settings.strings['currency'] = value;
      return respond({ key: 'currency', value });
    },
    getAssetsCurrency: () =>
      respond({
        key: 'assets_currency',
        value: store().settings.strings['assets_currency'] ?? 'RON',
      }),
    setAssetsCurrency: (value) => {
      store().settings.strings['assets_currency'] = value;
      return respond({ key: 'assets_currency', value });
    },
    getDebtsCurrency: () =>
      respond({
        key: 'debts_currency',
        value: store().settings.strings['debts_currency'] ?? 'RON',
      }),
    setDebtsCurrency: (value) => {
      store().settings.strings['debts_currency'] = value;
      return respond({ key: 'debts_currency', value });
    },
    getExchangeRates: () =>
      respond({
        usdToRon: store().settings.numbers['rate_usd_to_ron'] ?? 4.35,
        eurToRon: store().settings.numbers['rate_eur_to_ron'] ?? 5.09,
      }),
    setExchangeRates: (rates) => {
      store().settings.numbers['rate_usd_to_ron'] = rates.usdToRon;
      store().settings.numbers['rate_eur_to_ron'] = rates.eurToRon;
      return respond(rates);
    },
    getSections: () => respond(sections()),
    setSection: (id, enabled) => {
      const all = sections();
      const sec = all.find((x) => x.id === id);
      if (!sec) throw new ApiError(400, `unknown section: "${id}"\n`);
      if (!enabled && !sec.canDisable)
        throw new ApiError(409, "delete the section's entries before disabling it\n");
      sec.enabled = enabled;
      store().settings.strings['disabled_sections'] = all
        .filter((x) => !x.enabled)
        .map((x) => x.id)
        .join(',');
      return respond(all);
    },
  },

  assets: {
    list: () => respond([...store().assets].sort((a, b) => b.value - a.value)),
    get: (id) => respond(findOr404(store().assets, id)),
    history: () => respond(historyOf(store().assetEntries, 'totalValue')),
    snapshot: () => respond(undefined), // no-op on the server too: history derives from entries
    create: (body) => {
      const now = sqliteNow();
      const a: Asset = { ...body, id: newId('assets'), createdAt: now, updatedAt: now };
      store().assets.push(a);
      return respond(a);
    },
    update: (id, body) =>
      respond(Object.assign(findOr404(store().assets, id), body, { updatedAt: sqliteNow() })),
    remove: (id) => respond(removeOr404(store().assets, id)),
  },

  debts: {
    list: () => respond([...store().debts].sort((a, b) => b.balance - a.balance)),
    get: (id) => respond(findOr404(store().debts, id)),
    history: () => respond(historyOf(store().debtEntries, 'totalDebt')),
    snapshot: () => respond(undefined),
    create: (body) => {
      const now = sqliteNow();
      const d: Debt = { ...body, id: newId('debts'), createdAt: now, updatedAt: now };
      store().debts.push(d);
      return respond(d);
    },
    update: (id, body) =>
      respond(Object.assign(findOr404(store().debts, id), body, { updatedAt: sqliteNow() })),
    remove: (id) => respond(removeOr404(store().debts, id)),
  },

  debtEntries: {
    list: (date) => {
      const rows = store().debtEntries;
      return respond(sortEntriesDesc(date ? rows.filter((r) => r.date === date) : rows));
    },
    create: (body) => {
      const rows = store().debtEntries;
      if (rows.some((r) => r.date === body.date && r.name === body.name))
        throw unique('debt_entries', 'date,name');
      const e: DebtEntry = {
        ...body,
        id: newId('debtEntries'),
        createdAt: new Date().toISOString(),
      };
      rows.push(e);
      return respond(e);
    },
    update: (id, body) => {
      Object.assign(findOr404(store().debtEntries, id), body);
      return respond(undefined);
    },
    remove: (id) => respond(removeOr404(store().debtEntries, id)),
  },

  assetEntries: {
    list: (date) => {
      const rows = store().assetEntries;
      return respond(sortEntriesDesc(date ? rows.filter((r) => r.date === date) : rows));
    },
    create: (body) => {
      const rows = store().assetEntries;
      if (rows.some((r) => r.date === body.date && r.name === body.name))
        throw unique('asset_entries', 'date,name');
      const e: AssetEntry = {
        ...body,
        id: newId('assetEntries'),
        createdAt: new Date().toISOString(),
      };
      rows.push(e);
      return respond(e);
    },
    update: (id, body) => {
      Object.assign(findOr404(store().assetEntries, id), body);
      return respond(undefined);
    },
    remove: (id) => respond(removeOr404(store().assetEntries, id)),
  },

  // pkg/month: seed the current month from the latest one when it's missing.
  initMonth: () => {
    const s = store();
    const now = new Date();
    const yr = now.getFullYear();
    const moIdx = now.getMonth();
    const mo = MO[moIdx]!;
    const label = monthLabel(yr, moIdx);
    const monthFull = `${MO_FULL[moIdx]} ${yr}`;

    const latestEntry = [...s.entries].sort(byYearMonth).pop();
    if (latestEntry && !s.entries.some((e) => e.yr === yr && e.mo === mo)) {
      s.entries.push({
        ...latestEntry,
        id: newId('entries'),
        month: label,
        monthFull,
        yr,
        mo,
        note: '',
        createdAt: sqliteNow(),
      });
    }
    const latestSavings = [...s.savings].sort(byYearMonth).pop();
    if (latestSavings && !s.savings.some((e) => e.yr === yr && e.mo === mo)) {
      s.savings.push({
        ...latestSavings,
        id: newId('savings'),
        month: label,
        monthFull,
        yr,
        mo,
        note: '',
        updatedAt: sqliteNow(),
      });
    }
    for (const table of ['assetEntries', 'debtEntries'] as const) {
      const rows = s[table] as (AssetEntry | DebtEntry)[];
      const latest = sortEntriesDesc(rows)[0]?.date;
      if (!latest) continue;
      for (const r of rows.filter((x) => x.date === latest)) {
        if (!rows.some((x) => x.date === label && x.name === r.name)) {
          rows.push({ ...r, id: newId(table), date: label, createdAt: sqliteNow() });
        }
      }
    }
    return respond(undefined);
  },

  info: () => respond({ dbPath: 'In-browser demo data (resets on reload)' }),

  benchmarks: { get: () => respond(benchmarks(store().entries, store().benchmarkCloses)) },
});
